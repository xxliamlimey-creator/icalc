const fs = require("fs");
let html = fs.readFileSync("p-currency.html", "utf8");
const script = `
<script>
setTimeout(function () {
  var wrap = document.querySelector("#catScroll");
  var chips = Array.prototype.map.call(document.querySelectorAll(".cat"), function (c) {
    return c.textContent + "|" + c.className + "|" + getComputedStyle(c).backgroundColor;
  });
  var pre = document.createElement("pre");
  pre.id = "dbg";
  pre.textContent = JSON.stringify({ scrollLeft: wrap.scrollLeft, chips: chips });
  document.body.appendChild(pre);
}, 1400);
</script>
`;
html = html.replace("</body>", script + "</body>");
fs.writeFileSync("p-curdebug.html", html);
