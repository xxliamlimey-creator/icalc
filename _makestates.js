const fs = require("fs");
const base = fs.readFileSync("index.html", "utf8");

const history = JSON.stringify([
  { expr: "12+7×3", value: 33, display: "33", ts: Date.now() },
  { expr: "50+10%", value: 55, display: "55", ts: Date.now() },
  { expr: "sin(30)", value: 0.5, display: "0.5", ts: Date.now() },
  { expr: "120÷4", value: 30, display: "30", ts: Date.now() }
]);

function make(name, head, tail) {
  let html = base;
  if (head) html = html.replace("</head>", head + "</head>");
  if (tail) html = html.replace("</body>", tail + "</body>");
  fs.writeFileSync(name, html);
}

make(
  "p-menu.html",
  '<script>localStorage.setItem("icalc.history.v1", ' + JSON.stringify(history) + ");</script>",
  '<script>document.querySelector("#modeBtn").click();</script>'
);

make(
  "p-history.html",
  '<script>localStorage.setItem("icalc.history.v1", ' + JSON.stringify(history) + ");</script>",
  '<script>document.querySelector("#historyBtn").click();</script>'
);

make(
  "p-currency.html",
  '<script>localStorage.setItem("icalc.mode.v1", JSON.stringify("convert")); localStorage.setItem("icalc.convert.v1", JSON.stringify({catId:"currency", from:"USD", to:"EUR", value:"250"}));</script>'
);
