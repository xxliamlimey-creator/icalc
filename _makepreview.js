const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const setup = `
<script>
localStorage.setItem("icalc.mode.v1", JSON.stringify("notes"));
localStorage.setItem("icalc.notes.v1", JSON.stringify({ lines: [
  "12 + 7 =",
  "x = 4",
  "y = x^2 - 2",
  "y = sin(x)"
] }));
</script>
`;
html = html.replace("</head>", setup + "</head>");
fs.writeFileSync("p-notes.html", html);

let sci = fs.readFileSync("index.html", "utf8");
sci = sci.replace("</head>", '<script>localStorage.setItem("icalc.mode.v1", JSON.stringify("scientific"));</script></head>');
fs.writeFileSync("p-sci.html", sci);

let conv = fs.readFileSync("index.html", "utf8");
conv = conv.replace("</head>", '<script>localStorage.setItem("icalc.mode.v1", JSON.stringify("convert"));</script></head>');
fs.writeFileSync("p-conv.html", conv);
