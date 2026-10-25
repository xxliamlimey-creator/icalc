/* ============================================================
   iCalc — application
   ============================================================ */
(function () {
  "use strict";

  var E = window.MathEngine;
  var U = window.UnitData;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- storage ---------------- */

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  var KEYS = {
    history: "icalc.history.v1",
    mode: "icalc.mode.v1",
    angle: "icalc.angle.v1",
    notes: "icalc.notes.v1",
    convert: "icalc.convert.v1"
  };

  /* ---------------- state ---------------- */

  var state = {
    mode: "basic",
    history: store.get(KEYS.history, []) || [],
    calc: { expr: "", value: 0, evaluated: false, error: false, lastExpr: "" }
  };

  var MODE_LABELS = {
    basic: "Basic",
    scientific: "Scientific",
    notes: "Math Notes",
    convert: "Conversion"
  };

  /* ---------------- helpers ---------------- */

  function pretty(expr) {
    return E.pretty(expr);
  }

  function openParens(expr) {
    var open = 0;
    for (var i = 0; i < expr.length; i++) {
      if (expr[i] === "(") open++;
      else if (expr[i] === ")") open--;
    }
    return open;
  }

  function lastChar(expr) {
    return expr.slice(-1);
  }

  function isOperatorChar(ch) {
    return "+-−×÷^*/".indexOf(ch) !== -1;
  }

  function endsWithOperand(expr) {
    return /[\d)πe%!]$/.test(expr);
  }

  var toastTimer = null;
  function toast(message) {
    var el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  /* ---------------- display ---------------- */

  function fitDisplay() {
    var el = $("#displayMain");
    el.style.fontSize = "";
    var computed = parseFloat(getComputedStyle(el).fontSize) || 68;
    var available = el.parentElement.clientWidth - 12;
    var size = computed;
    var guard = 0;
    while (el.scrollWidth > available && size > 24 && guard < 80) {
      size -= 2;
      el.style.fontSize = size + "px";
      guard++;
    }
  }

  function renderCalc(pop) {
    var c = state.calc;
    var main = $("#displayMain");
    var sub = $("#displaySub");
    var text;
    var subText = "";

    if (c.error) {
      text = "Error";
      subText = c.lastExpr ? pretty(c.lastExpr) + " =" : "";
    } else if (c.evaluated) {
      text = E.format(c.value);
      subText = c.lastExpr ? pretty(c.lastExpr) + " =" : "";
    } else {
      text = c.expr ? pretty(c.expr) : "0";
    }

    main.textContent = text;
    sub.textContent = subText;
    main.classList.toggle("error", !!c.error);
    fitDisplay();

    var clear = $('[data-a="clear"]');
    if (clear) clear.textContent = c.expr && !c.evaluated && !c.error ? "C" : "AC";

    var activeOp = null;
    if (!c.evaluated && !c.error && c.expr) {
      var ch = lastChar(c.expr);
      if ("+−×÷^".indexOf(ch) !== -1) activeOp = ch;
      else if (ch === "-") activeOp = "−";
    }
    $$(".key.op[data-v]").forEach(function (key) {
      key.classList.toggle("active", key.getAttribute("data-v") === activeOp);
    });

    if (pop) {
      main.classList.remove("pop");
      void main.offsetWidth;
      main.classList.add("pop");
    }

    saveCalc();
  }

  function saveCalc() {
    // intentionally not persisted — calculators should start fresh
  }

  /* ---------------- calculator input ---------------- */

  function resetInput() {
    var c = state.calc;
    if (c.evaluated || c.error) {
      c.expr = "";
      c.evaluated = false;
      c.error = false;
      c.lastExpr = "";
      c.value = 0;
    }
  }

  function inputDigit(d) {
    var c = state.calc;
    resetInput();
    var expr = c.expr;

    if (/[)πe%!]$/.test(expr)) expr += "×";

    var seg = (expr.match(/[\d.]*$/) || [""])[0];
    var before = expr.slice(0, expr.length - seg.length);
    var prev = lastChar(before);

    if (seg === "0" && (prev === "" || prev === "(" || isOperatorChar(prev))) {
      expr = expr.slice(0, -1) + d;
    } else {
      if (seg.replace(".", "").length >= 15) return;
      expr += d;
    }

    c.expr = expr;
    renderCalc(false);
  }

  function inputDot() {
    var c = state.calc;
    resetInput();
    var expr = c.expr;

    if (/[)πe%!]$/.test(expr)) expr += "×";

    var seg = (expr.match(/[\d.]*$/) || [""])[0];
    if (seg.indexOf(".") !== -1) return;

    if (!seg) {
      if (expr === "" || isOperatorChar(lastChar(expr)) || lastChar(expr) === "(") {
        expr += "0.";
      } else {
        expr += "×0.";
      }
    } else {
      expr += ".";
    }

    c.expr = expr;
    renderCalc(false);
  }

  function inputOperator(op) {
    var c = state.calc;

    if (c.error) {
      c.error = false;
      c.evaluated = false;
      c.expr = "";
    }

    if (c.evaluated) {
      c.expr = E.raw(c.value).replace(/-/g, "−");
      c.evaluated = false;
      c.lastExpr = "";
    }

    var expr = c.expr;

    if (!expr) {
      if (op === "−") expr = "−";
    } else {
      var ch = lastChar(expr);
      if (ch === "(") {
        if (op === "−") expr += "−";
      } else if (isOperatorChar(ch)) {
        if (op === "−" && "×÷^*".indexOf(ch) !== -1) {
          expr += "−";
        } else if (ch === "−" && op === "−") {
          expr = expr.slice(0, -1) + "+";
        } else {
          expr = expr.slice(0, -1) + op;
        }
      } else {
        expr += op;
      }
    }

    c.expr = expr;
    renderCalc(false);
  }

  function toggleSign() {
    var c = state.calc;

    if (c.evaluated || c.error) {
      if (c.error) {
        clearCalc();
        return;
      }
      c.value = -c.value;
      c.expr = E.raw(c.value).replace(/-/g, "−");
      c.lastExpr = "";
      c.evaluated = true;
      renderCalc(false);
      return;
    }

    var expr = c.expr;
    var match = expr.match(/(\d+\.?\d*)$/);
    if (match) {
      var idx = expr.length - match[0].length;
      var before = expr.slice(0, idx);
      var minus = lastChar(before);

      if (minus === "−" || minus === "-") {
        var beforeMinus = before.slice(0, -1);
        if (beforeMinus === "" || isOperatorChar(lastChar(beforeMinus)) || lastChar(beforeMinus) === "(") {
          expr = beforeMinus + match[0];
        } else {
          expr = before + "−" + match[0];
        }
      } else {
        expr = before + "−" + match[0];
      }
      c.expr = expr;
    } else if (expr === "") {
      c.expr = "−";
    }

    renderCalc(false);
  }

  function inputPercent() {
    var c = state.calc;

    if (c.evaluated) {
      var old = c.value;
      c.value = old / 100;
      c.expr = E.raw(c.value).replace(/-/g, "−");
      c.lastExpr = E.raw(old) + "%";
      renderCalc(true);
      return;
    }

    if (endsWithOperand(c.expr)) {
      c.expr += "%";
      renderCalc(false);
    }
  }

  function insertToken(text) {
    var c = state.calc;
    resetInput();
    var expr = c.expr;

    if (text === ")") {
      if (openParens(expr) > 0) expr += ")";
    } else if (text.indexOf("^") === 0) {
      if (endsWithOperand(expr)) expr += text;
    } else if (text === "π" || text === "e") {
      if (endsWithOperand(expr)) expr += "×";
      expr += text;
    } else {
      if (endsWithOperand(expr)) expr += "×";
      expr += text;
    }

    c.expr = expr;
    renderCalc(false);
  }

  function equals() {
    var c = state.calc;
    if (c.evaluated && !c.error) return;

    var expr = c.expr;
    if (!expr) return;

    var trimmed = expr.replace(/[+\-−×÷^*/]+$/, "");
    if (!trimmed || trimmed === "−" || trimmed === "-") return;

    while (openParens(trimmed) > 0) trimmed += ")";

    c.lastExpr = trimmed;

    try {
      var value = E.evaluate(trimmed, {});
      c.value = value;
      c.evaluated = true;
      c.error = false;
      addHistory(expr, value);
      renderCalc(true);
    } catch (err) {
      c.error = true;
      c.evaluated = true;
      renderCalc(false);
      var main = $("#displayMain");
      main.classList.remove("error");
      void main.offsetWidth;
      main.classList.add("error");
    }
  }

  function clearCalc() {
    var c = state.calc;
    c.expr = "";
    c.value = 0;
    c.evaluated = false;
    c.error = false;
    c.lastExpr = "";
    renderCalc(false);
  }

  function handleKey(action, value) {
    switch (action) {
      case "digit": inputDigit(value); break;
      case "dot": inputDot(); break;
      case "op": inputOperator(value); break;
      case "equals": equals(); break;
      case "clear": clearCalc(); break;
      case "sign": toggleSign(); break;
      case "percent": inputPercent(); break;
      case "insert": insertToken(value); break;
      default: break;
    }
  }

  /* ---------------- keypad ---------------- */

  var BASIC_KEYS = [
    { t: "fn", label: "AC", a: "clear" },
    { t: "fn", label: "±", a: "sign" },
    { t: "fn", label: "%", a: "percent" },
    { t: "op", label: "÷", a: "op", v: "÷" },
    { t: "num", label: "7", a: "digit", v: "7" },
    { t: "num", label: "8", a: "digit", v: "8" },
    { t: "num", label: "9", a: "digit", v: "9" },
    { t: "op", label: "×", a: "op", v: "×" },
    { t: "num", label: "4", a: "digit", v: "4" },
    { t: "num", label: "5", a: "digit", v: "5" },
    { t: "num", label: "6", a: "digit", v: "6" },
    { t: "op", label: "−", a: "op", v: "−" },
    { t: "num", label: "1", a: "digit", v: "1" },
    { t: "num", label: "2", a: "digit", v: "2" },
    { t: "num", label: "3", a: "digit", v: "3" },
    { t: "op", label: "+", a: "op", v: "+" },
    { t: "num", label: "0", a: "digit", v: "0", wide: true },
    { t: "num", label: ".", a: "dot" },
    { t: "op", label: "=", a: "equals" }
  ];

  var SCI_KEYS = [
    { label: "(", a: "insert", v: "(" },
    { label: ")", a: "insert", v: ")" },
    { label: "√", a: "insert", v: "√(" },
    { label: "x²", a: "insert", v: "^2" },
    { label: "sin", a: "insert", v: "sin(" },
    { label: "cos", a: "insert", v: "cos(" },
    { label: "tan", a: "insert", v: "tan(" },
    { label: "π", a: "insert", v: "π" },
    { label: "ln", a: "insert", v: "ln(" },
    { label: "log", a: "insert", v: "log(" },
    { label: "e", a: "insert", v: "e" },
    { label: "^", a: "insert", v: "^" }
  ];

  function buildKey(def) {
    var btn = document.createElement("button");
    btn.className = "key " + (def.t || "sci");
    btn.type = "button";
    btn.textContent = def.label;
    btn.setAttribute("data-a", def.a);
    if (def.v !== undefined) btn.setAttribute("data-v", def.v);
    if (def.wide) btn.classList.add("wide");
    btn.setAttribute("aria-label", def.label === "−" ? "minus" : def.label);

    if (def.a === "digit") btn.setAttribute("aria-label", "digit " + def.label);
    if (def.a === "equals") btn.setAttribute("aria-label", "equals");
    if (def.a === "clear") btn.setAttribute("aria-label", "all clear");
    if (def.a === "sign") btn.setAttribute("aria-label", "toggle sign");
    if (def.a === "percent") btn.setAttribute("aria-label", "percent");

    return btn;
  }

  function renderKeypad() {
    var pad = $("#keypad");
    pad.innerHTML = "";

    if (state.mode === "scientific") {
      SCI_KEYS.forEach(function (def) {
        var key = buildKey(def);
        key.classList.add("sci");
        pad.appendChild(key);
      });
    }

    BASIC_KEYS.forEach(function (def) {
      pad.appendChild(buildKey(def));
    });

    if (state.mode === "scientific") {
      var zero = $('[data-a="digit"][data-v="0"]', pad);
      if (zero) zero.classList.add("wide");
    }

    renderCalc(false);
  }

  $("#keypad").addEventListener("click", function (event) {
    var key = event.target.closest(".key");
    if (!key) return;
    handleKey(key.getAttribute("data-a"), key.getAttribute("data-v"));
  });

  /* ---------------- history ---------------- */

  function addHistory(expr, value) {
    state.history.unshift({
      expr: expr,
      value: value,
      display: E.format(value),
      ts: Date.now()
    });
    if (state.history.length > 60) state.history.length = 60;
    store.set(KEYS.history, state.history);
    renderHistory();
  }

  function renderHistory() {
    var list = $("#historyList");
    list.innerHTML = "";

    if (!state.history.length) {
      var empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = '<span class="big">∅</span>No calculations yet.<br>Your results will show up here.';
      list.appendChild(empty);
      return;
    }

    state.history.forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = "history-item";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");

      var main = document.createElement("div");
      main.className = "history-main";

      var expr = document.createElement("div");
      expr.className = "history-expr";
      expr.textContent = pretty(String(item.expr));

      var result = document.createElement("div");
      result.className = "history-result";
      result.textContent = item.display;

      main.appendChild(expr);
      main.appendChild(result);

      var copy = document.createElement("button");
      copy.className = "history-copy";
      copy.type = "button";
      copy.setAttribute("aria-label", "Copy result");
      copy.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"></path></svg>';

      copy.addEventListener("click", function (event) {
        event.stopPropagation();
        copyText(String(item.value));
      });

      row.appendChild(main);
      row.appendChild(copy);

      function reuse() {
        var c = state.calc;
        c.value = item.value;
        c.expr = E.raw(item.value).replace(/-/g, "−");
        c.lastExpr = String(item.expr);
        c.evaluated = true;
        c.error = false;
        closeHistory();
        if (state.mode !== "basic" && state.mode !== "scientific") setMode("basic");
        renderCalc(true);
      }

      row.addEventListener("click", reuse);
      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          reuse();
        }
      });

      list.appendChild(row);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast("Copied " + text); },
        function () { toast("Could not copy"); }
      );
    } else {
      var area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); toast("Copied " + text); } catch (e) { toast("Could not copy"); }
      document.body.removeChild(area);
    }
  }

  function openHistory() {
    closeMenu();
    $("#historySheet").classList.add("open");
    $("#historySheet").setAttribute("aria-hidden", "false");
    $("#scrim").classList.add("show");
    $("#historyBtn").setAttribute("aria-expanded", "true");
    renderHistory();
  }

  function closeHistory() {
    $("#historySheet").classList.remove("open");
    $("#historySheet").setAttribute("aria-hidden", "true");
    $("#scrim").classList.remove("show");
    $("#historyBtn").setAttribute("aria-expanded", "false");
  }

  $("#historyBtn").addEventListener("click", openHistory);
  $("#scrim").addEventListener("click", closeHistory);
  $("#clearHistory").addEventListener("click", function () {
    if (!state.history.length) return;
    state.history = [];
    store.set(KEYS.history, state.history);
    renderHistory();
    toast("History cleared");
  });

  /* ---------------- mode menu ---------------- */

  var modeMenu = $("#modeMenu");

  function openMenu() {
    modeMenu.classList.add("open");
    modeMenu.setAttribute("aria-hidden", "false");
    $("#modeBtn").setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    modeMenu.classList.remove("open");
    modeMenu.setAttribute("aria-hidden", "true");
    $("#modeBtn").setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    if (modeMenu.classList.contains("open")) closeMenu();
    else openMenu();
  }

  $("#modeBtn").addEventListener("click", function (event) {
    event.stopPropagation();
    toggleMenu();
  });

  modeMenu.addEventListener("click", function (event) {
    var item = event.target.closest(".mode-item");
    if (!item) return;
    setMode(item.getAttribute("data-mode"));
  });

  document.addEventListener("click", function (event) {
    if (!modeMenu.classList.contains("open")) return;
    if (event.target.closest("#modeMenu") || event.target.closest("#modeBtn")) return;
    closeMenu();
  });

  $$(".mode-item").forEach(function (item) {
    if (item.getAttribute("data-mode") === state.mode) item.classList.add("active");
  });

  function setMode(mode) {
    if (!MODE_LABELS[mode]) return;
    state.mode = mode;
    store.set(KEYS.mode, mode);

    $("#app").classList.toggle("mode-scientific", mode === "scientific");
    $("#calcScreen").hidden = mode !== "basic" && mode !== "scientific";
    $("#convertScreen").hidden = mode !== "convert";
    $("#notesScreen").hidden = mode !== "notes";
    $("#angleChip").hidden = mode !== "scientific";
    $("#modeLabel").textContent = MODE_LABELS[mode];

    $$(".mode-item").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-mode") === mode);
    });

    closeMenu();

    if (mode === "basic" || mode === "scientific") {
      renderKeypad();
    } else if (modeHandlers[mode]) {
      modeHandlers[mode]();
    }
  }

  /* ---------------- angle ---------------- */

  var savedAngle = store.get(KEYS.angle, "deg");
  E.setAngleMode(savedAngle === "rad" ? "rad" : "deg");
  $("#angleChip").textContent = E.getAngleMode() === "deg" ? "DEG" : "RAD";

  $("#angleChip").addEventListener("click", function () {
    var next = E.getAngleMode() === "deg" ? "rad" : "deg";
    E.setAngleMode(next);
    store.set(KEYS.angle, next);
    $("#angleChip").textContent = next === "deg" ? "DEG" : "RAD";

    if (state.calc.evaluated && state.calc.lastExpr && !state.calc.error) {
      try {
        state.calc.value = E.evaluate(state.calc.lastExpr, {});
        renderCalc(true);
      } catch (e) {}
    }
  });

  /* ---------------- keyboard ---------------- */

  document.addEventListener("keydown", function (event) {
    var tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    if (event.key === "Escape") {
      if ($("#historySheet").classList.contains("open")) closeHistory();
      else if (modeMenu.classList.contains("open")) closeMenu();
      else if (state.mode === "basic" || state.mode === "scientific") clearCalc();
      return;
    }

    if (state.mode !== "basic" && state.mode !== "scientific") return;
    if ($("#historySheet").classList.contains("open")) return;

    var key = event.key;

    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      inputDigit(key);
    } else if (key === "." || key === ",") {
      event.preventDefault();
      inputDot();
    } else if (key === "+" || key === "-") {
      event.preventDefault();
      inputOperator(key === "-" ? "−" : "+");
    } else if (key === "*" || key === "x" || key === "X") {
      event.preventDefault();
      inputOperator("×");
    } else if (key === "/") {
      event.preventDefault();
      inputOperator("÷");
    } else if (key === "^") {
      event.preventDefault();
      inputOperator("^");
    } else if (key === "(" || key === ")") {
      event.preventDefault();
      insertToken(key);
    } else if (key === "%") {
      event.preventDefault();
      inputPercent();
    } else if (key === "Enter" || key === "=") {
      event.preventDefault();
      equals();
    } else if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      if (state.calc.evaluated || state.calc.error) clearCalc();
      else {
        state.calc.expr = state.calc.expr.slice(0, -1);
        renderCalc(false);
      }
    } else if (key === "c" || key === "C") {
      event.preventDefault();
      clearCalc();
    }
  });

  /* ---------------- mode handlers / boot ---------------- */

  var modeHandlers = {};

  function boot() {
    renderHistory();
    var savedMode = store.get(KEYS.mode, "basic");
    if (!MODE_LABELS[savedMode]) savedMode = "basic";
    setMode(savedMode);
    renderCalc(false);
  }

  window.__icalc = {
    state: state,
    setMode: setMode,
    toast: toast,
    store: store,
    keys: KEYS,
    onMode: function (mode, fn) { modeHandlers[mode] = fn; },
    boot: boot
  };
})();
