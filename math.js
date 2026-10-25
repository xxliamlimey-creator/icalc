/* ============================================================
   iCalc — expression engine
   A small recursive-descent parser + evaluator.
   ============================================================ */
(function (root) {
  "use strict";

  var angleMode = "deg";

  function ParseError(message) {
    this.name = "ParseError";
    this.message = message;
    this.stack = new Error(message).stack;
  }
  ParseError.prototype = Object.create(Error.prototype);
  ParseError.prototype.constructor = ParseError;

  var CONSTS = {
    "π": Math.PI,
    "pi": Math.PI,
    "τ": Math.PI * 2,
    "e": Math.E,
    "phi": (1 + Math.sqrt(5)) / 2,
    "inf": Infinity
  };

  function trig(fn) {
    return function (x) {
      var v = fn(angleMode === "deg" ? (x * Math.PI) / 180 : x);
      return Math.abs(v) < 1e-12 ? 0 : v;
    };
  }
  function invTrig(fn) {
    return function (x) {
      var v = fn(x);
      return angleMode === "deg" ? (v * 180) / Math.PI : v;
    };
  }
  function tanSafe(x) {
    var rad = angleMode === "deg" ? (x * Math.PI) / 180 : x;
    var c = Math.cos(rad);
    if (Math.abs(c) < 1e-12) return Infinity;
    var v = Math.tan(rad);
    return Math.abs(v) < 1e-12 ? 0 : v;
  }

  var FUNCS = {
    sin: trig(Math.sin),
    cos: trig(Math.cos),
    tan: tanSafe,
    asin: invTrig(Math.asin),
    acos: invTrig(Math.acos),
    atan: invTrig(Math.atan),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log,
    log: function (x) { return Math.log10(x); },
    log10: function (x) { return Math.log10(x); },
    log2: Math.log2,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    mod: function (a, b) { return a % b; }
  };

  function normalize(src) {
    return String(src)
      .replace(/×/g, "*")
      .replace(/·/g, "*")
      .replace(/÷/g, "/")
      .replace(/[−–—]/g, "-")
      .replace(/√/g, "sqrt")
      .replace(/（/g, "(")
      .replace(/）/g, ")");
  }

  function isDigit(c) { return c >= "0" && c <= "9"; }
  function isAlpha(c) {
    return /[a-zA-Zπτ_]/.test(c);
  }

  function tokenize(source) {
    var s = normalize(source);
    var tokens = [];
    var i = 0;

    while (i < s.length) {
      var c = s[i];

      if (c === " " || c === "\t" || c === "\n" || c === ",") {
        if (c === ",") tokens.push({ type: "," });
        i++;
        continue;
      }

      if (isDigit(c) || (c === "." && isDigit(s[i + 1]))) {
        var j = i;
        var dot = false;
        while (j < s.length) {
          var d = s[j];
          if (d === "." && !dot) { dot = true; j++; continue; }
          if (isDigit(d)) { j++; continue; }
          break;
        }
        // exponent form: 1e5, 2.5E-3
        if (s[j] === "e" || s[j] === "E") {
          var k = j + 1;
          if (s[k] === "+" || s[k] === "-") k++;
          if (isDigit(s[k])) {
            k++;
            while (isDigit(s[k])) k++;
            tokens.push({ type: "num", value: parseFloat(s.slice(i, k)), text: s.slice(i, k) });
            i = k;
            continue;
          }
        }
        tokens.push({ type: "num", value: parseFloat(s.slice(i, j)), text: s.slice(i, j) });
        i = j;
        continue;
      }

      if (isAlpha(c)) {
        var m = i;
        while (m < s.length && /[a-zA-Z0-9πτ_]/.test(s[m])) m++;
        tokens.push({ type: "id", value: s.slice(i, m) });
        i = m;
        continue;
      }

      if ("+-*/^%!()".indexOf(c) !== -1) {
        tokens.push({ type: c, value: c });
        i++;
        continue;
      }

      throw new ParseError('Unexpected "' + c + '"');
    }

    return tokens;
  }

  function Parser(tokens, vars, symbols) {
    this.tokens = tokens;
    this.pos = 0;
    this.vars = vars || {};
    this.symbols = symbols || null;
  }

  Parser.prototype.peek = function () { return this.tokens[this.pos]; };
  Parser.prototype.next = function () { return this.tokens[this.pos++]; };
  Parser.prototype.expect = function (type) {
    var tk = this.next();
    if (!tk || tk.type !== type) throw new ParseError("Expected " + type);
    return tk;
  };

  Parser.prototype.parse = function () {
    if (!this.tokens.length) throw new ParseError("Empty expression");
    var node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new ParseError('Unexpected "' + (this.tokens[this.pos].value || this.tokens[this.pos].type) + '"');
    }
    return node;
  };

  Parser.prototype.parseExpr = function () {
    var node = this.parseTerm();
    for (;;) {
      var tk = this.peek();
      if (!tk || (tk.type !== "+" && tk.type !== "-")) break;
      this.next();
      var right = this.parseTerm();
      if (right.type === "pct") {
        right = { type: "pctOf", inner: right.inner, base: node };
      }
      node = { type: "bin", op: tk.type, left: node, right: right };
    }
    return node;
  };

  Parser.prototype.startsPrimary = function (tk) {
    return !!tk && (tk.type === "num" || tk.type === "id" || tk.type === "(");
  };

  Parser.prototype.parseTerm = function () {
    var node = this.parseUnary();
    for (;;) {
      var tk = this.peek();
      if (!tk) break;
      if (tk.type === "*" || tk.type === "/") {
        this.next();
        node = { type: "bin", op: tk.type, left: node, right: this.parseUnary() };
        continue;
      }
      if (this.startsPrimary(tk)) {
        node = { type: "bin", op: "*", left: node, right: this.parseUnary() };
        continue;
      }
      break;
    }
    return node;
  };

  Parser.prototype.parseUnary = function () {
    var tk = this.peek();
    if (tk && tk.type === "+") { this.next(); return this.parseUnary(); }
    if (tk && tk.type === "-") { this.next(); return { type: "neg", value: this.parseUnary() }; }
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var node = this.parsePostfix();
    if (this.peek() && this.peek().type === "^") {
      this.next();
      node = { type: "bin", op: "^", left: node, right: this.parseUnary() };
    }
    return node;
  };

  Parser.prototype.parsePostfix = function () {
    var node = this.parsePrimary();
    for (;;) {
      var tk = this.peek();
      if (!tk) break;
      if (tk.type === "!") { this.next(); node = { type: "fact", value: node }; continue; }
      if (tk.type === "%") { this.next(); node = { type: "pct", inner: node }; continue; }
      break;
    }
    return node;
  };

  Parser.prototype.parsePrimary = function () {
    var tk = this.next();
    if (!tk) throw new ParseError("Unexpected end of expression");

    if (tk.type === "num") return { type: "num", value: tk.value };

    if (tk.type === "(") {
      var inner = this.parseExpr();
      this.expect(")");
      return inner;
    }

    if (tk.type === "id") {
      var name = tk.value;
      var lower = name.toLowerCase();

      if (this.peek() && this.peek().type === "(") {
        if (!FUNCS[lower]) throw new ParseError('Unknown function "' + name + '"');
        this.next();
        var args = [];
        if (!(this.peek() && this.peek().type === ")")) {
          args.push(this.parseExpr());
          while (this.peek() && this.peek().type === ",") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        this.expect(")");
        if (lower === "min" || lower === "max" || lower === "pow" || lower === "mod") {
          if (args.length < 2) throw new ParseError(name + "() needs two values");
        }
        return { type: "call", name: lower, args: args };
      }

      if (Object.prototype.hasOwnProperty.call(CONSTS, lower)) {
        return { type: "num", value: CONSTS[lower] };
      }
      if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
        return { type: "num", value: this.vars[name] };
      }
      if (Object.prototype.hasOwnProperty.call(this.vars, lower)) {
        return { type: "num", value: this.vars[lower] };
      }
      if (this.symbols && Object.prototype.hasOwnProperty.call(this.symbols, name)) {
        return { type: "var", name: name };
      }
      throw new ParseError('Unknown symbol "' + name + '"');
    }

    throw new ParseError('Unexpected "' + (tk.value || tk.type) + '"');
  };

  function factorial(n) {
    if (n < 0 || !isFinite(n)) throw new ParseError("Factorial is not defined here");
    if (!Number.isInteger(n)) throw new ParseError("Factorial needs a whole number");
    if (n > 170) return Infinity;
    var out = 1;
    for (var i = 2; i <= n; i++) out *= i;
    return out;
  }

  function evaluateNode(node, scope) {
    switch (node.type) {
      case "num":
        return node.value;
      case "var":
        if (scope && Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
        throw new ParseError('Unknown symbol "' + node.name + '"');
      case "neg":
        return -evaluateNode(node.value, scope);
      case "pct":
        return evaluateNode(node.inner, scope) / 100;
      case "pctOf":
        return (evaluateNode(node.base, scope) * evaluateNode(node.inner, scope)) / 100;
      case "fact":
        return factorial(evaluateNode(node.value, scope));
      case "call": {
        var fn = FUNCS[node.name];
        if (!fn) throw new ParseError('Unknown function "' + node.name + '"');
        var args = node.args.map(function (arg) { return evaluateNode(arg, scope); });
        var result = fn.apply(null, args);
        return typeof result === "number" ? result : NaN;
      }
      case "bin": {
        var a = evaluateNode(node.left, scope);
        var b = evaluateNode(node.right, scope);
        switch (node.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return a / b;
          case "^": return Math.pow(a, b);
        }
        throw new ParseError("Unknown operator");
      }
    }
    throw new ParseError("Cannot evaluate expression");
  }

  function parse(source, vars, symbols) {
    var tokens = tokenize(source);
    var parser = new Parser(tokens, vars, symbols);
    return parser.parse();
  }

  function evaluate(source, vars) {
    var node = parse(source, vars);
    var value = evaluateNode(node, vars);
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ParseError("Not a number");
    }
    return value;
  }

  function compile(source, vars, symbols) {
    return parse(source, vars, symbols);
  }

  function format(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "Error";
    if (!isFinite(value)) return "Error";
    if (Object.is(value, -0)) value = 0;

    var abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      var e = value.toExponential(8);
      e = e.replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e").replace("e+", "e");
      return e;
    }

    var rounded = Number(value.toPrecision(12));
    var s = String(rounded);
    var parts = s.split("e");
    var mant = parts[0];
    var exp = parts[1];
    var neg = mant.charAt(0) === "-";
    if (neg) mant = mant.slice(1);
    var split = mant.split(".");
    var int = split[0] || "0";
    var dec = split[1];
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + int + (dec ? "." + dec : "") + (exp ? "e" + exp : "");
  }

  function raw(value) {
    if (!isFinite(value)) return "0";
    if (Object.is(value, -0)) return "0";
    var rounded = Number(value.toPrecision(15));
    return String(rounded);
  }

  function pretty(source) {
    return String(source)
      .replace(/\*/g, "×")
      .replace(/\//g, "÷")
      .replace(/-/g, "−")
      .replace(/\bpi\b/gi, "π")
      .replace(/\bsqrt\b/gi, "√")
      .replace(/\^2(?![0-9])/g, "²")
      .replace(/\^3(?![0-9])/g, "³")
      .replace(/\s+/g, " ");
  }

  var ENGINE = {
    ParseError: ParseError,
    tokenize: tokenize,
    parse: parse,
    compile: compile,
    evaluate: evaluate,
    evaluateNode: evaluateNode,
    format: format,
    raw: raw,
    pretty: pretty,
    normalize: normalize,
    setAngleMode: function (mode) {
      angleMode = mode === "rad" ? "rad" : "deg";
    },
    getAngleMode: function () { return angleMode; },
    constants: CONSTS,
    functions: FUNCS
  };

  if (typeof module !== "undefined" && module.exports) module.exports = ENGINE;
  root.MathEngine = ENGINE;
})(typeof window !== "undefined" ? window : globalThis);
