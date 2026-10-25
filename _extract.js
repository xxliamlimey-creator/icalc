const fs = require("fs");
const html = fs.readFileSync("dump.html", "utf8");
const match = html.match(/<pre id="testout">([\s\S]*?)<\/pre>/);
if (!match) {
  console.log("NO OUTPUT");
  process.exit(1);
}
const text = match[1]
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&");
console.log(text);
