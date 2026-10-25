const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const script = `
<script>
setTimeout(function () {
  var pad = document.querySelector("#keypad");
  var scr = document.querySelector("#calcScreen");
  var app = document.querySelector("#app");
  var dev = document.querySelector("#device");
  var cs = getComputedStyle(pad);
  var pre = document.createElement("pre");
  pre.id = "dbg";
  pre.textContent = JSON.stringify({
    inner: [innerWidth, innerHeight],
    device: Math.round(dev.getBoundingClientRect().width),
    app: Math.round(app.getBoundingClientRect().width),
    screen: Math.round(scr.getBoundingClientRect().width),
    pad: Math.round(pad.getBoundingClientRect().width),
    padStyle: { width: cs.width, maxWidth: cs.maxWidth, flex: cs.flex, display: cs.display },
    cols: cs.gridTemplateColumns,
    key: Math.round(pad.children[0].getBoundingClientRect().width),
    className: app.className
  });
  document.body.appendChild(pre);
}, 500);
</script>
`;
html = html.replace("</body>", script + "</body>");
fs.writeFileSync("p-layout.html", html);
