// アプリのアイコン（icon-192.png・icon-512.png）を作る。水色の海に、紺の点線の予報円と、円に向かう台風の進路。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#112f52"/>
      <circle cx="56" cy="40" r="27" fill="#cfe2ef33" stroke="#fdfdfb" stroke-width="4" stroke-dasharray="8 5"/>
      <g fill="none" stroke-width="3" stroke-linecap="round"><path d="M28 86Q40 62 52 34" stroke="#7fd1a4"/><path d="M28 86Q50 66 66 46" stroke="#7fd1a4"/><path d="M28 86Q66 70 90 58" stroke="#f0a050"/></g>
      <circle cx="52" cy="34" r="4" fill="#7fd1a4"/><circle cx="66" cy="46" r="4" fill="#7fd1a4"/><path d="M86 54l8 8m0-8l-8 8" stroke="#f0a050" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="28" cy="86" r="8" fill="#e8473a" stroke="#fff" stroke-width="2"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
