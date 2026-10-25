/* ============================================================
   iCalc — Math Notes + graphing
   ============================================================ */
(function () {
  "use strict";

  var api = window.__icalc;
  var E = window.MathEngine;
  var $ = function (sel) { return document.querySelector(sel); };

  var COLORS = ["#ff9f0a", "#0a84ff", "#30d158", "#bf5af2", "#ff453a", "#64d2ff", "#ffd60a"];

  var saved = api.store.get(api.keys.notes, null);
  var notes = {
    lines: saved && Array.isArray(saved.lines) && saved.lines.length
      ? saved.lines.map(function (line) { return String(line); })
      : [""],
    vars: {},
    graphs: []
  };

  var wrap = $("#noteLines");
  var scroll = $("#notesScroll");
  var varsBar = $("#varsBar");
  var graphCard = $("#graphCard");
  var canvas = $("#graphCanvas");
  var legend = $("#graphLegend");

  var view = { xMin: -10, xMax: 10, yMin: -6.3, yMax: 6.3 };
  var viewCustomized = false;
  var dragging = null;
  var lastSize = { w: 0, h: 0 };

  /* ---------------- analysis ---------------- */

  function analyze(text) {
    var t = String(text).trim();
    if (!t) return { kind: "empty" };

    var eq = t.lastIndexOf("=");
    if (eq === -1) return { kind: "expr", expr: t };

    var lhs = t.slice(0, eq).trim();
    var rhs = t.slice(eq + 1).trim();
    if (!lhs) return { kind: "invalid" };

    var simple = /^[A-Za-z_][A-Za-z0-9_]*$/.exec(lhs);
    var fn = /^[A-Za-z_][A-Za-z0-9_]*\s*\(\s*x\s*\)$/i.exec(lhs);

    if (rhs) {
      if (/^y$/i.test(lhs) || fn) return { kind: "graph", label: lhs, expr: rhs };
      if (simple) return { kind: "assign", name: simple[0], expr: rhs };
      return { kind: "check", lhs: lhs, rhs: rhs };
    }

    return { kind: "solve", expr: lhs };
  }

  /* ---------------- variables ---------------- */

  function buildVars() {
    var defs = [];
    notes.lines.forEach(function (line) {
      var a = analyze(line);
      if (a.kind === "assign") defs.push(a);
    });

    var vars = {};
    for (var pass = 0; pass < 2; pass++) {
      defs.forEach(function (def) {
        try {
          var value = E.evaluate(def.expr, vars);
          if (isFinite(value)) vars[def.name] = value;
        } catch (e) {}
      });
    }
    return vars;
  }

  function renderVars() {
    varsBar.innerHTML = "";
    var names = Object.keys(notes.vars);
    names.forEach(function (name) {
      var chip = document.createElement("div");
      chip.className = "var-chip";

      var label = document.createElement("button");
      label.className = "var-name";
      label.type = "button";
      label.textContent = name;
      label.addEventListener("click", function () {
        var idx = findAssignLine(name);
        if (idx >= 0) {
          var input = wrap.querySelector('.note-input[data-index="' + idx + '"]');
          if (input) {
            input.focus();
            var pos = input.value.indexOf("=") + 1;
            input.setSelectionRange(pos, pos);
          }
        }
      });

      var value = document.createElement("span");
      value.className = "var-val";
      value.textContent = E.format(notes.vars[name]);

      var minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease " + name);
      minus.addEventListener("click", function () { stepVar(name, -1); });

      var plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase " + name);
      plus.addEventListener("click", function () { stepVar(name, 1); });

      chip.appendChild(label);
      chip.appendChild(document.createTextNode("="));
      chip.appendChild(value);
      chip.appendChild(minus);
      chip.appendChild(plus);
      varsBar.appendChild(chip);
    });
  }

  function findAssignLine(name) {
    var found = -1;
    notes.lines.forEach(function (line, index) {
      var a = analyze(line);
      if (a.kind === "assign" && a.name === name) found = index;
    });
    return found;
  }

  function stepVar(name, delta) {
    var index = findAssignLine(name);
    if (index < 0) return;
    var line = notes.lines[index];
    var eq = line.lastIndexOf("=");
    var current = typeof notes.vars[name] === "number" ? notes.vars[name] : 0;
    var next = Math.round((current + delta) * 1e9) / 1e9;
    notes.lines[index] = line.slice(0, eq + 1) + " " + E.raw(next);
    var input = wrap.querySelector('.note-input[data-index="' + index + '"]');
    if (input) input.value = notes.lines[index];
    recompute();
  }

  /* ---------------- rendering lines ---------------- */

  function renderLines(focusIndex) {
    wrap.innerHTML = "";

    notes.lines.forEach(function (text, index) {
      var row = document.createElement("div");
      row.className = "note-line";

      var num = document.createElement("span");
      num.className = "row-num";
      num.textContent = String(index + 1);

      var input = document.createElement("input");
      input.className = "note-input";
      input.type = "text";
      input.value = text;
      input.spellcheck = false;
      input.autocomplete = "off";
      input.setAttribute("autocorrect", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("data-index", String(index));
      input.setAttribute("aria-label", "Math note line " + (index + 1));
      if (index === 0) input.placeholder = "Try 12 + 7 =";

      var result = document.createElement("span");
      result.className = "note-result";

      row.appendChild(num);
      row.appendChild(input);
      row.appendChild(result);
      wrap.appendChild(row);
    });

    if (typeof focusIndex === "number") {
      var target = wrap.querySelector('.note-input[data-index="' + focusIndex + '"]');
      if (target) {
        target.focus();
        var end = target.value.length;
        target.setSelectionRange(end, end);
      }
    }
  }

  function resultFor(index) {
    var row = wrap.children[index];
    return row ? row.querySelector(".note-result") : null;
  }

  function setRowGraphable(index, on) {
    var row = wrap.children[index];
    if (row) row.classList.toggle("graphable", !!on);
  }

  /* ---------------- recompute ---------------- */

  function recompute() {
    notes.vars = buildVars();

    notes.lines.forEach(function (line, index) {
      var result = resultFor(index);
      if (!result) return;
      result.className = "note-result";
      result.textContent = "";
      setRowGraphable(index, false);

      var a = analyze(line);
      if (a.kind === "solve" || a.kind === "check") {
        try {
          var expr = a.kind === "solve" ? a.expr : a.lhs;
          var value = E.evaluate(expr, notes.vars);
          result.textContent = E.format(value);
          result.classList.add("solved");
        } catch (e) {
          result.textContent = "Error";
          result.classList.add("invalid");
        }
      } else if (a.kind === "graph") {
        try {
          var ast = E.compile(a.expr, graphVars(), { x: true });
          E.evaluateNode(ast, { x: 0 });
          result.textContent = "Graph";
          result.classList.add("graph-chip");
          setRowGraphable(index, true);
        } catch (e) {
          result.textContent = "Error";
          result.classList.add("invalid");
        }
      }
    });

    renderVars();
    collectGraphs();
    renderGraph();
    save();
  }

  function graphVars() {
    var copy = {};
    Object.keys(notes.vars).forEach(function (key) {
      if (key !== "x") copy[key] = notes.vars[key];
    });
    return copy;
  }

  function collectGraphs() {
    var list = [];
    notes.lines.forEach(function (line, index) {
      var a = analyze(line);
      if (a.kind !== "graph") return;
      try {
        var ast = E.compile(a.expr, graphVars(), { x: true });
        E.evaluateNode(ast, { x: 0 });
        list.push({
          ast: ast,
          label: a.label,
          src: a.expr,
          color: COLORS[list.length % COLORS.length],
          index: index
        });
      } catch (e) {}
    });
    notes.graphs = list;
  }

  /* ---------------- graph drawing ---------------- */

  function prepareCanvas() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastSize = { w: w, h: h };
    return { ctx: ctx, w: w, h: h };
  }

  function niceStep(raw) {
    if (!isFinite(raw) || raw <= 0) return 1;
    var exp = Math.floor(Math.log10(raw));
    var f = raw / Math.pow(10, exp);
    var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * Math.pow(10, exp);
  }

  function tickLabel(value, step) {
    if (Math.abs(value) < 1e-9) return "0";
    var text;
    var decimals = step < 1 ? Math.min(4, Math.ceil(-Math.log10(step))) : 0;
    text = value.toFixed(decimals);
    if (text.indexOf(".") !== -1) text = text.replace(/0+$/, "").replace(/\.$/, "");
    return text;
  }

  function drawGraph() {
    if (!notes.graphs.length) return;

    var prepared = prepareCanvas();
    var ctx = prepared.ctx;
    var w = prepared.w;
    var h = prepared.h;

    if (!viewCustomized) {
      var aspect = h / w;
      view.yMin = -10 * aspect;
      view.yMax = 10 * aspect;
    }

    var xSpan = view.xMax - view.xMin;
    var ySpan = view.yMax - view.yMin;

    function xToPx(x) { return ((x - view.xMin) / xSpan) * w; }
    function yToPx(y) { return h - ((y - view.yMin) / ySpan) * h; }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(0, 0, w, h);

    var xStep = niceStep(xSpan / 5.5);
    var yStep = niceStep(ySpan / 4.5);

    // grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.062)";
    ctx.beginPath();
    var x;
    for (x = Math.ceil(view.xMin / xStep) * xStep; x <= view.xMax; x += xStep) {
      var px = Math.round(xToPx(x)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    var y;
    for (y = Math.ceil(view.yMin / yStep) * yStep; y <= view.yMax; y += yStep) {
      var py = Math.round(yToPx(y)) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();

    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (view.yMin <= 0 && view.yMax >= 0) {
      var axisY = Math.round(yToPx(0)) + 0.5;
      ctx.moveTo(0, axisY);
      ctx.lineTo(w, axisY);
    }
    if (view.xMin <= 0 && view.xMax >= 0) {
      var axisX = Math.round(xToPx(0)) + 0.5;
      ctx.moveTo(axisX, 0);
      ctx.lineTo(axisX, h);
    }
    ctx.stroke();

    // tick labels
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    var labelY = view.yMin <= 0 && view.yMax >= 0 ? Math.min(h - 13, yToPx(0) + 3) : h - 13;
    for (x = Math.ceil(view.xMin / xStep) * xStep; x <= view.xMax; x += xStep) {
      if (Math.abs(x) < xStep / 1000) continue;
      ctx.fillText(tickLabel(x, xStep), xToPx(x), labelY);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var labelX = view.xMin <= 0 && view.xMax >= 0 ? Math.max(22, xToPx(0) - 4) : w - 4;
    for (y = Math.ceil(view.yMin / yStep) * yStep; y <= view.yMax; y += yStep) {
      if (Math.abs(y) < yStep / 1000) continue;
      ctx.fillText(tickLabel(y, yStep), labelX, yToPx(y));
    }

    // curves
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.lineWidth = 2.1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    var previousAngle = E.getAngleMode();
    E.setAngleMode("rad");

    notes.graphs.forEach(function (graph) {
      ctx.strokeStyle = graph.color;
      ctx.beginPath();
      var started = false;
      var prevPy = 0;

      for (var sampleX = 0; sampleX <= w; sampleX++) {
        var mathX = view.xMin + (sampleX / w) * xSpan;
        var mathY;
        try {
          mathY = E.evaluateNode(graph.ast, { x: mathX });
        } catch (e) {
          mathY = NaN;
        }

        if (typeof mathY !== "number" || !isFinite(mathY)) {
          started = false;
          continue;
        }

        var sy = yToPx(mathY);
        if (sy < -h * 8 || sy > h * 9) {
          started = false;
          continue;
        }

        if (!started || Math.abs(sy - prevPy) > h * 3) {
          ctx.moveTo(sampleX, sy);
          started = true;
        } else {
          ctx.lineTo(sampleX, sy);
        }
        prevPy = sy;
      }
      ctx.stroke();
    });

    E.setAngleMode(previousAngle);
    ctx.restore();

    renderLegend();
  }

  function renderLegend() {
    legend.innerHTML = "";
    notes.graphs.forEach(function (graph) {
      var item = document.createElement("span");
      item.className = "legend-item";
      var dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = graph.color;
      var text = document.createElement("span");
      var label = graph.label.replace(/\s+/g, "");
      text.textContent = label + " = " + E.pretty(graph.src);
      item.appendChild(dot);
      item.appendChild(text);
      legend.appendChild(item);
    });
  }

  function renderGraph() {
    if (!notes.graphs.length) {
      graphCard.hidden = true;
      return;
    }
    graphCard.hidden = false;
    // wait for layout when the card was just revealed
    requestAnimationFrame(drawGraph);
  }

  function resetView() {
    view = { xMin: -10, xMax: 10, yMin: -6.3, yMax: 6.3 };
    viewCustomized = false;
    drawGraph();
  }

  function zoomGraph(factor, centerX, centerY) {
    var prepared = { w: lastSize.w || 300, h: lastSize.h || 160 };
    var cx = typeof centerX === "number" ? view.xMin + (centerX / prepared.w) * (view.xMax - view.xMin) : (view.xMin + view.xMax) / 2;
    var cy = typeof centerY === "number" ? view.yMax - (centerY / prepared.h) * (view.yMax - view.yMin) : (view.yMin + view.yMax) / 2;

    view.xMin = cx + (view.xMin - cx) * factor;
    view.xMax = cx + (view.xMax - cx) * factor;
    view.yMin = cy + (view.yMin - cy) * factor;
    view.yMax = cy + (view.yMax - cy) * factor;
    viewCustomized = true;
    drawGraph();
  }

  function panGraph(dx, dy) {
    var prepared = { w: lastSize.w || 300, h: lastSize.h || 160 };
    var xShift = (dx / prepared.w) * (view.xMax - view.xMin);
    var yShift = (dy / prepared.h) * (view.yMax - view.yMin);
    view.xMin -= xShift;
    view.xMax -= xShift;
    view.yMin += yShift;
    view.yMax += yShift;
    viewCustomized = true;
    drawGraph();
  }

  /* ---------------- graph interactions ---------------- */

  var surface = canvas.parentElement;

  surface.addEventListener("pointerdown", function (event) {
    if (!notes.graphs.length) return;
    dragging = { x: event.clientX, y: event.clientY };
    surface.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  surface.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    var dx = event.clientX - dragging.x;
    var dy = event.clientY - dragging.y;
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    panGraph(dx, dy);
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = null;
    try { surface.releasePointerCapture(event.pointerId); } catch (e) {}
  }
  surface.addEventListener("pointerup", endDrag);
  surface.addEventListener("pointercancel", endDrag);

  surface.addEventListener("wheel", function (event) {
    if (!notes.graphs.length) return;
    event.preventDefault();
    var rect = surface.getBoundingClientRect();
    var factor = event.deltaY > 0 ? 1.14 : 0.88;
    zoomGraph(factor, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  Array.prototype.forEach.call(document.querySelectorAll("[data-graph]"), function (button) {    button.addEventListener("click", function () {
      var action = button.getAttribute("data-graph");
      if (action === "reset") resetView();
      else if (action === "in") zoomGraph(0.8);
      else if (action === "out") zoomGraph(1.25);
    });
  });

  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      if (!graphCard.hidden && notes.graphs.length) drawGraph();
    });
    ro.observe(canvas.parentElement);
  }

  /* ---------------- note editing ---------------- */

  wrap.addEventListener("input", function (event) {
    var input = event.target;
    if (!input.classList || !input.classList.contains("note-input")) return;
    var index = Number(input.getAttribute("data-index"));
    notes.lines[index] = input.value;
    recompute();
  });

  wrap.addEventListener("keydown", function (event) {
    var input = event.target;
    if (!input.classList || !input.classList.contains("note-input")) return;
    var index = Number(input.getAttribute("data-index"));

    if (event.key === "Enter") {
      event.preventDefault();
      notes.lines.splice(index + 1, 0, "");
      renderLines(index + 1);
      recompute();
    } else if (event.key === "Backspace" && input.value === "" && notes.lines.length > 1) {
      event.preventDefault();
      notes.lines.splice(index, 1);
      renderLines(Math.max(0, index - 1));
      recompute();
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      var up = wrap.querySelector('.note-input[data-index="' + (index - 1) + '"]');
      if (up) { up.focus(); var l = up.value.length; up.setSelectionRange(l, l); }
    } else if (event.key === "ArrowDown" && index < notes.lines.length - 1) {
      event.preventDefault();
      var down = wrap.querySelector('.note-input[data-index="' + (index + 1) + '"]');
      if (down) { down.focus(); var d = down.value.length; down.setSelectionRange(d, d); }
    }
  });

  $("#clearNotes").addEventListener("click", function () {
    notes.lines = [""];
    notes.vars = {};
    notes.graphs = [];
    viewCustomized = false;
    renderLines(0);
    recompute();
    $("#notesScroll").scrollTop = 0;
  });

  var eqButton = $("#noteEquals");
  eqButton.addEventListener("mousedown", function (event) {
    event.preventDefault();
  });
  eqButton.addEventListener("click", function () {
    var active = document.activeElement;
    var input = active && active.classList && active.classList.contains("note-input")
      ? active
      : wrap.querySelector('.note-input[data-index="' + (notes.lines.length - 1) + '"]');

    if (!input) return;
    input.focus();

    if (input.value.indexOf("=") !== -1) {
      var end = input.value.length;
      input.setSelectionRange(end, end);
      return;
    }

    var start = input.selectionStart;
    var stop = input.selectionEnd;
    if (start === null) start = input.value.length;
    if (stop === null) stop = start;

    input.value = input.value.slice(0, start) + "=" + input.value.slice(stop);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    var caret = start + 1;
    input.setSelectionRange(caret, caret);
  });

  /* ---------------- lifecycle ---------------- */

  function save() {
    api.store.set(api.keys.notes, { lines: notes.lines });
  }

  function open() {
    if (!wrap.children.length) {
      renderLines();
      recompute();
    } else {
      renderGraph();
    }
  }

  // build once so the first visit is instant
  renderLines();
  recompute();
  api.onMode("notes", open);
})();
