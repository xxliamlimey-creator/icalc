const fs = require("fs");
const template = fs.readFileSync("p-mobile.html", "utf8");
fs.writeFileSync("p-mobile-sci.html", template.replace('src="index.html"', 'src="p-sci.html"'));
fs.writeFileSync("p-mobile-notes.html", template.replace('src="index.html"', 'src="p-notes.html"'));
