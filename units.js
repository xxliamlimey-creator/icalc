/* ============================================================
   iCalc — unit conversion data
   ============================================================ */
(function (root) {
  "use strict";

  function u(id, name, symbol, factor) {
    return { id: id, name: name, symbol: symbol, factor: factor };
  }

  var CATEGORIES = [
    {
      id: "length",
      name: "Length",
      kind: "linear",
      from: "m",
      to: "ft",
      units: [
        u("m", "Meters", "m", 1),
        u("km", "Kilometers", "km", 1000),
        u("cm", "Centimeters", "cm", 0.01),
        u("mm", "Millimeters", "mm", 0.001),
        u("mi", "Miles", "mi", 1609.344),
        u("yd", "Yards", "yd", 0.9144),
        u("ft", "Feet", "ft", 0.3048),
        u("in", "Inches", "in", 0.0254),
        u("nmi", "Nautical Miles", "nmi", 1852)
      ]
    },
    {
      id: "mass",
      name: "Weight",
      kind: "linear",
      from: "kg",
      to: "lb",
      units: [
        u("kg", "Kilograms", "kg", 1),
        u("g", "Grams", "g", 0.001),
        u("mg", "Milligrams", "mg", 0.000001),
        u("lb", "Pounds", "lb", 0.45359237),
        u("oz", "Ounces", "oz", 0.028349523125),
        u("st", "Stone", "st", 6.35029318),
        u("t", "Metric Tons", "t", 1000)
      ]
    },
    {
      id: "temperature",
      name: "Temperature",
      kind: "temperature",
      from: "c",
      to: "f",
      units: [
        u("c", "Celsius", "°C", 1),
        u("f", "Fahrenheit", "°F", 1),
        u("k", "Kelvin", "K", 1)
      ]
    },
    {
      id: "speed",
      name: "Speed",
      kind: "linear",
      from: "kmh",
      to: "mph",
      units: [
        u("ms", "Meters per second", "m/s", 1),
        u("kmh", "Kilometers per hour", "km/h", 1 / 3.6),
        u("mph", "Miles per hour", "mph", 0.44704),
        u("kn", "Knots", "kn", 0.514444444),
        u("fts", "Feet per second", "ft/s", 0.3048)
      ]
    },
    {
      id: "volume",
      name: "Volume",
      kind: "linear",
      from: "l",
      to: "gal",
      units: [
        u("l", "Liters", "L", 1),
        u("ml", "Milliliters", "mL", 0.001),
        u("m3", "Cubic meters", "m³", 1000),
        u("gal", "Gallons (US)", "gal", 3.785411784),
        u("qt", "Quarts (US)", "qt", 0.946352946),
        u("pt", "Pints (US)", "pt", 0.473176473),
        u("cup", "Cups (US)", "cup", 0.2365882365),
        u("floz", "Fluid ounces (US)", "fl oz", 0.0295735295625)
      ]
    },
    {
      id: "area",
      name: "Area",
      kind: "linear",
      from: "m2",
      to: "ft2",
      units: [
        u("m2", "Square meters", "m²", 1),
        u("km2", "Square kilometers", "km²", 1000000),
        u("cm2", "Square centimeters", "cm²", 0.0001),
        u("ha", "Hectares", "ha", 10000),
        u("acre", "Acres", "ac", 4046.8564224),
        u("ft2", "Square feet", "ft²", 0.09290304),
        u("in2", "Square inches", "in²", 0.00064516),
        u("yd2", "Square yards", "yd²", 0.83612736)
      ]
    },
    {
      id: "time",
      name: "Time",
      kind: "linear",
      from: "h",
      to: "min",
      units: [
        u("s", "Seconds", "s", 1),
        u("ms", "Milliseconds", "ms", 0.001),
        u("min", "Minutes", "min", 60),
        u("h", "Hours", "h", 3600),
        u("d", "Days", "d", 86400),
        u("wk", "Weeks", "wk", 604800),
        u("yr", "Years", "yr", 31557600)
      ]
    },
    {
      id: "data",
      name: "Data",
      kind: "linear",
      from: "gb",
      to: "mb",
      units: [
        u("b", "Bytes", "B", 1),
        u("kb", "Kilobytes", "KB", 1000),
        u("mb", "Megabytes", "MB", 1000000),
        u("gb", "Gigabytes", "GB", 1000000000),
        u("tb", "Terabytes", "TB", 1000000000000),
        u("kib", "Kibibytes", "KiB", 1024),
        u("mib", "Mebibytes", "MiB", 1048576),
        u("gib", "Gibibytes", "GiB", 1073741824)
      ]
    },
    {
      id: "energy",
      name: "Energy",
      kind: "linear",
      from: "kcal",
      to: "kj",
      units: [
        u("j", "Joules", "J", 1),
        u("kj", "Kilojoules", "kJ", 1000),
        u("cal", "Calories", "cal", 4.184),
        u("kcal", "Kilocalories", "kcal", 4184),
        u("wh", "Watt hours", "Wh", 3600),
        u("kwh", "Kilowatt hours", "kWh", 3600000),
        u("btu", "British thermal units", "BTU", 1055.06)
      ]
    },
    {
      id: "pressure",
      name: "Pressure",
      kind: "linear",
      from: "bar",
      to: "psi",
      units: [
        u("pa", "Pascals", "Pa", 1),
        u("kpa", "Kilopascals", "kPa", 1000),
        u("bar", "Bars", "bar", 100000),
        u("atm", "Atmospheres", "atm", 101325),
        u("psi", "Pounds per sq. inch", "psi", 6894.757293168),
        u("mmhg", "Millimeters of mercury", "mmHg", 133.322387415)
      ]
    },
    {
      id: "angle",
      name: "Angle",
      kind: "linear",
      from: "deg",
      to: "rad",
      units: [
        u("deg", "Degrees", "°", 1),
        u("rad", "Radians", "rad", 57.29577951308232),
        u("grad", "Gradians", "grad", 0.9),
        u("turn", "Turns", "turn", 360)
      ]
    },
    {
      id: "currency",
      name: "Currency",
      kind: "currency",
      from: "USD",
      to: "EUR",
      units: [
        u("USD", "US Dollar", "USD", 1),
        u("EUR", "Euro", "EUR", 0.91),
        u("GBP", "British Pound", "GBP", 0.78),
        u("JPY", "Japanese Yen", "JPY", 155),
        u("CNY", "Chinese Yuan", "CNY", 7.12),
        u("INR", "Indian Rupee", "INR", 84.2),
        u("CAD", "Canadian Dollar", "CAD", 1.38),
        u("AUD", "Australian Dollar", "AUD", 1.52),
        u("CHF", "Swiss Franc", "CHF", 0.88),
        u("KRW", "South Korean Won", "KRW", 1385),
        u("BRL", "Brazilian Real", "BRL", 5.55),
        u("MXN", "Mexican Peso", "MXN", 18.4),
        u("SGD", "Singapore Dollar", "SGD", 1.34),
        u("HKD", "Hong Kong Dollar", "HKD", 7.8),
        u("SEK", "Swedish Krona", "SEK", 10.4),
        u("NOK", "Norwegian Krone", "NOK", 10.6),
        u("NZD", "New Zealand Dollar", "NZD", 1.66),
        u("ZAR", "South African Rand", "ZAR", 18.1),
        u("AED", "UAE Dirham", "AED", 3.6725),
        u("TRY", "Turkish Lira", "TRY", 34.2)
      ]
    }
  ];

  function toCelsius(value, unit) {
    if (unit === "f") return ((value - 32) * 5) / 9;
    if (unit === "k") return value - 273.15;
    return value;
  }
  function fromCelsius(value, unit) {
    if (unit === "f") return (value * 9) / 5 + 32;
    if (unit === "k") return value + 273.15;
    return value;
  }

  function get(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return CATEGORIES[0];
  }

  function unit(category, id) {
    for (var i = 0; i < category.units.length; i++) {
      if (category.units[i].id === id) return category.units[i];
    }
    return category.units[0];
  }

  function convert(category, value, fromId, toId) {
    var from = unit(category, fromId);
    var to = unit(category, toId);
    if (!isFinite(value)) return NaN;

    if (category.kind === "temperature") {
      return fromCelsius(toCelsius(value, from.id), to.id);
    }
    if (category.kind === "currency") {
      return (value / from.factor) * to.factor;
    }
    return (value * from.factor) / to.factor;
  }

  function applyRates(rates) {
    var currency = get("currency");
    currency.units.forEach(function (unitDef) {
      var key = unitDef.id;
      if (typeof rates[key] === "number" && rates[key] > 0) {
        unitDef.factor = rates[key];
      }
    });
  }

  function fmt(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    if (!isFinite(value)) return "—";
    if (Object.is(value, -0)) value = 0;
    if (value === 0) return "0";
    var abs = Math.abs(value);
    if (abs >= 1e12 || abs < 1e-6) {
      return value
        .toExponential(4)
        .replace(/(\.\d*?)0+e/, "$1e")
        .replace(/\.e/, "e")
        .replace("e+", "e");
    }
    var digits;
    if (abs >= 1000) digits = 2;
    else if (abs >= 100) digits = 3;
    else if (abs >= 1) digits = 4;
    else digits = 6;
    return value.toLocaleString("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    });
  }

  root.UnitData = {
    categories: CATEGORIES,
    get: get,
    unit: unit,
    convert: convert,
    applyRates: applyRates,
    format: fmt
  };
})(typeof window !== "undefined" ? window : globalThis);
