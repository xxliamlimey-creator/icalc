const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const test = `
<script>
window.__errors = [];
window.addEventListener("error", function (e) { window.__errors.push(e.message); });
setTimeout(function () {
  var out = [];
  var $ = function (s) { return document.querySelector(s); };
  function click(a, v) {
    var sel = ".key[data-a='" + a + "']" + (v !== undefined ? "[data-v='" + v + "']" : "");
    var k = document.querySelector(sel);
    if (!k) { out.push("MISSING KEY " + a + " " + v); return; }
    k.click();
  }
  function snap(n) {
    out.push(n + " => [" + $("#displayMain").textContent + "] sub [" + $("#displaySub").textContent + "]");
  }
  try {
    click("digit", "1"); click("digit", "2"); snap("12");
    click("op", "+"); click("digit", "7"); click("op", "×"); click("digit", "3"); click("equals"); snap("12+7*3");
    click("clear"); click("digit", "5"); click("digit", "0"); click("op", "+"); click("digit", "1"); click("digit", "0"); click("percent"); click("equals"); snap("50+10%");
    click("clear"); click("digit", "0"); click("dot"); click("digit", "5"); click("op", "+"); click("digit", "0"); click("dot"); click("digit", "2"); click("op", "×"); click("digit", "3"); click("equals"); snap("0.5+0.2*3");

    window.__icalc.setMode("scientific");
    out.push("mode=" + window.__icalc.state.mode + " sciKeys=" + document.querySelectorAll(".key.sci").length);
    click("insert", "sin("); click("digit", "3"); click("digit", "0"); click("insert", ")"); click("equals"); snap("sin(30)");

    document.querySelector("#historyBtn").click();
    out.push("historyItems=" + document.querySelectorAll(".history-item").length + " sheetOpen=" + document.querySelector("#historySheet").classList.contains("open"));
    document.querySelector("#historySheet .history-item").click();
    snap("historyReuse");

    window.__icalc.setMode("notes");
    var inp0 = document.querySelector(".note-input[data-index='0']");
    inp0.value = "12 + 7=";
    inp0.dispatchEvent(new Event("input", { bubbles: true }));
    out.push("noteResult0=" + document.querySelectorAll(".note-result")[0].textContent);
    inp0.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    var inp1 = document.querySelector(".note-input[data-index='1']");
    inp1.value = "x = 4";
    inp1.dispatchEvent(new Event("input", { bubbles: true }));
    inp1.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    var inp2 = document.querySelector(".note-input[data-index='2']");
    inp2.value = "y = x^2 + 1";
    inp2.dispatchEvent(new Event("input", { bubbles: true }));
    out.push("vars=[" + document.querySelector("#varsBar").textContent.trim().replace(/\\s+/g, " ") + "]");
    out.push("graphHidden=" + document.querySelector("#graphCard").hidden + " legend=[" + document.querySelector("#graphLegend").textContent + "]");
    inp2.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    var inp3 = document.querySelector(".note-input[data-index='3']");
    inp3.value = "y = sin(x)";
    inp3.dispatchEvent(new Event("input", { bubbles: true }));
    out.push("legend2=[" + document.querySelector("#graphLegend").textContent + "] canvas=" + document.querySelector("#graphCanvas").width + "x" + document.querySelector("#graphCanvas").height);
    var inc = document.querySelector(".var-chip button[aria-label='Increase x']");
    if (inc) inc.click();
    out.push("afterStep line1=[" + document.querySelector(".note-input[data-index='1']").value + "] result0=[" + document.querySelectorAll(".note-result")[0].textContent + "]");

    window.__icalc.setMode("convert");
    var cv = document.querySelector("#convValue");
    cv.value = "2"; cv.dispatchEvent(new Event("input", { bubbles: true }));
    out.push("conv 2m=" + document.querySelector("#convOut").textContent + " formula=[" + document.querySelector("#convFormula").textContent + "]");
    document.querySelector(".cat[data-cat='temperature']").click();
    cv.value = "100"; cv.dispatchEvent(new Event("input", { bubbles: true }));
    out.push("conv 100C=" + document.querySelector("#convOut").textContent + " badgeHidden=" + document.querySelector("#rateBadge").hidden);

    window.__icalc.setMode("basic");
    var pad = document.querySelector("#keypad");
    var zero = document.querySelector(".key.wide");
    var one = document.querySelector(".key[data-a='digit'][data-v='7']");
    var zr = zero.getBoundingClientRect(), or = one.getBoundingClientRect();
    out.push("layout padW=" + Math.round(pad.getBoundingClientRect().width) + " key=" + Math.round(or.width) + " zeroH=" + Math.round(zr.height) + " keyH=" + Math.round(or.height) + " bottom=" + Math.round(zr.bottom));
    out.push("errors=" + JSON.stringify(window.__errors));
  } catch (err) {
    out.push("EXCEPTION " + err.message + " " + err.stack);
  }
  var pre = document.createElement("pre");
  pre.id = "testout";
  pre.textContent = out.join("\\n");
  document.body.appendChild(pre);
}, 600);
</script>
`;

html = html.replace("</body>", test + "</body>");
fs.writeFileSync("p-test.html", html);
console.log("written");
