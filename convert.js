/* ============================================================
   iCalc — unit conversion mode
   ============================================================ */
(function () {
  "use strict";

  var api = window.__icalc;
  var U = window.UnitData;
  var $ = function (sel) { return document.querySelector(sel); };

  var saved = api.store.get(api.keys.convert, null);

  var conv = {
    catId: saved && saved.catId ? saved.catId : "length",
    from: saved && saved.from ? saved.from : "m",
    to: saved && saved.to ? saved.to : "ft",
    value: saved && typeof saved.value === "string" ? saved.value : "1",
    live: false,
    fetched: false,
    ratesPromise: null
  };

  var cat = U.get(conv.catId);
  if (!U.unit(cat, conv.from)) conv.from = cat.from;
  if (!U.unit(cat, conv.to)) conv.to = cat.to;
  if (conv.from === conv.to) conv.to = cat.units[1] ? cat.units[1].id : cat.to;

  function save() {
    api.store.set(api.keys.convert, {
      catId: conv.catId,
      from: conv.from,
      to: conv.to,
      value: conv.value
    });
  }

  /* ---------- categories ---------- */

  function buildCats() {
    var wrap = $("#catScroll");
    wrap.innerHTML = "";
    U.categories.forEach(function (category) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cat";
      chip.setAttribute("data-cat", category.id);
      chip.setAttribute("role", "tab");
      chip.textContent = category.name;
      chip.addEventListener("click", function () {
        if (conv.catId === category.id) return;
        conv.catId = category.id;
        conv.from = category.from;
        conv.to = category.to;
        syncSelects();
        syncCats();
        render();
        save();
        if (category.id === "currency") ensureRates();
      });
      wrap.appendChild(chip);
    });
  }

  function syncCats() {
    var active = U.get(conv.catId);
    var activeChip = null;
    Array.prototype.forEach.call(document.querySelectorAll(".cat"), function (chip) {
      var on = chip.getAttribute("data-cat") === active.id;
      chip.classList.toggle("active", on);
      chip.setAttribute("aria-selected", on ? "true" : "false");
      if (on) activeChip = chip;
    });

    var wrap = document.getElementById("catScroll");
    if (activeChip && wrap) {
      var wr = wrap.getBoundingClientRect();
      var cr = activeChip.getBoundingClientRect();
      wrap.scrollLeft += cr.left - wr.left - (wr.width - cr.width) / 2;
    }
  }

  /* ---------- selects ---------- */

  function optionsFor(category, selected) {
    var frag = document.createDocumentFragment();
    category.units.forEach(function (unit) {
      var opt = document.createElement("option");
      opt.value = unit.id;
      opt.textContent = unit.symbol + "  ·  " + unit.name;
      if (unit.id === selected) opt.selected = true;
      frag.appendChild(opt);
    });
    return frag;
  }

  function syncSelects() {
    var category = U.get(conv.catId);
    var fromSel = $("#convFrom");
    var toSel = $("#convTo");
    fromSel.innerHTML = "";
    toSel.innerHTML = "";
    fromSel.appendChild(optionsFor(category, conv.from));
    toSel.appendChild(optionsFor(category, conv.to));
    fromSel.value = conv.from;
    toSel.value = conv.to;
  }

  /* ---------- rendering ---------- */

  function numericValue() {
    var s = String(conv.value).trim();
    if (!s || s === "-" || s === "." || s === "-.") return NaN;
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function render() {
    var category = U.get(conv.catId);
    var fromUnit = U.unit(category, conv.from);
    var toUnit = U.unit(category, conv.to);
    var value = numericValue();
    var out = isFinite(value) ? U.convert(category, value, conv.from, conv.to) : NaN;

    $("#convOut").textContent = isFinite(out) ? U.format(out) : "—";
    $("#convValue").value = conv.value;

    if (isFinite(value) && isFinite(out)) {
      $("#convFormula").textContent =
        U.format(value) + " " + fromUnit.symbol + " = " + U.format(out) + " " + toUnit.symbol;
    } else {
      $("#convFormula").textContent = fromUnit.symbol + " → " + toUnit.symbol;
    }

    // also equals
    var list = $("#convList");
    list.innerHTML = "";
    var others = category.units.filter(function (unit) {
      return unit.id !== conv.from && unit.id !== conv.to;
    });
    if (!others.length) {
      var none = document.createElement("div");
      none.className = "conv-list-row";
      none.innerHTML = "<span>No additional units</span><b></b>";
      list.appendChild(none);
    }
    others.slice(0, 9).forEach(function (unit) {
      var row = document.createElement("div");
      row.className = "conv-list-row";
      var left = document.createElement("span");
      left.textContent = unit.name;
      var right = document.createElement("b");
      var converted = isFinite(value) ? U.convert(category, value, conv.from, unit.id) : NaN;
      right.textContent = isFinite(converted) ? U.format(converted) + " " + unit.symbol : "—";
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });

    // rate badge
    var badge = $("#rateBadge");
    if (conv.catId !== "currency") {
      badge.hidden = true;
    } else {
      badge.hidden = false;
      badge.classList.toggle("offline", !conv.live);
      badge.textContent = conv.fetched ? (conv.live ? "Live rates" : "Offline rates") : "Updating rates…";
    }
  }

  /* ---------- currency rates ---------- */

  function ensureRates() {
    if (conv.ratesPromise) return conv.ratesPromise;
    conv.fetched = false;

    conv.ratesPromise = new Promise(function (resolve) {
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) controller.abort();
      }, 7000);

      var request;
      try {
        request = fetch("https://open.er-api.com/v6/latest/USD", controller ? { signal: controller.signal } : undefined);
      } catch (e) {
        conv.fetched = true;
        conv.live = false;
        resolve();
        return;
      }

      request
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data && data.rates) {
            U.applyRates(data.rates);
            conv.live = true;
          }
        })
        .catch(function () {
          conv.live = false;
        })
        .then(function () {
          clearTimeout(timer);
          conv.fetched = true;
          conv.live = conv.live === true;
          render();
          resolve();
        });
    });

    return conv.ratesPromise;
  }

  /* ---------- events ---------- */

  function bind() {
    buildCats();

    $("#convFrom").addEventListener("change", function (event) {
      conv.from = event.target.value;
      if (conv.to === conv.from) {
        var other = U.get(conv.catId).units.filter(function (u) { return u.id !== conv.from; });
        if (other.length) conv.to = other[0].id;
        $("#convTo").value = conv.to;
      }
      render();
      save();
    });

    $("#convTo").addEventListener("change", function (event) {
      conv.to = event.target.value;
      if (conv.from === conv.to) {
        var other = U.get(conv.catId).units.filter(function (u) { return u.id !== conv.to; });
        if (other.length) conv.from = other[0].id;
        $("#convFrom").value = conv.from;
      }
      render();
      save();
    });

    $("#convValue").addEventListener("input", function (event) {
      var input = event.target;
      var raw = input.value;
      var cleaned = raw.replace(/,/g, "").replace(/[^0-9.\-]/g, "");
      var negative = cleaned.charAt(0) === "-";
      cleaned = cleaned.replace(/-/g, "");
      var dot = cleaned.indexOf(".");
      if (dot !== -1) {
        cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
      }
      var next = (negative ? "-" : "") + cleaned;
      input.value = next;
      conv.value = next;
      render();
      save();
    });

    $("#swapBtn").addEventListener("click", function () {
      if (conv.from === conv.to) return;
      var tmp = conv.from;
      conv.from = conv.to;
      conv.to = tmp;
      $("#convFrom").value = conv.from;
      $("#convTo").value = conv.to;
      render();
      save();
    });

    $("#convValue").addEventListener("keydown", function (event) {
      if (event.key === "Enter") event.target.blur();
    });
  }

  function open() {
    syncSelects();
    syncCats();
    render();
    if (conv.catId === "currency") ensureRates();
  }

  bind();
  api.onMode("convert", open);
})();
