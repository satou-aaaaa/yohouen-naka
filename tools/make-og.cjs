// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ（20本の台風。予報円に入るのは約14本＝約70%）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  // 図：予報円（点線）と、いまの位置から流れる20本の進路（14本が円の中・6本が外。練習の例）
  const R = 100, cx = 230, cy = 225, sx = 230, sy = 480, ends = [];
  for (let i = 0; i < 20; i++) { const u = (i + 0.5) / 20, r = Math.sqrt(Math.log(1 - u) / Math.log(0.3)), a = i * 2.39996; ends.push([cx + r * R * Math.cos(a), cy + r * R * Math.sin(a), r <= 1]); } // 縦も横も同じ縮尺（印と円の中かどうかを合わせる。CodeRabbit #1）
  const tr = ends.map(([x, y, ins], i) => `<path d="M${sx} ${sy}Q${sx + (i % 5 - 2) * 18} ${(sy + cy) / 2} ${x.toFixed(0)} ${y.toFixed(0)}" fill="none" stroke="${ins ? "#1f6e48" : "#c25a00"}" stroke-width="3" opacity=".6"/>` + (ins ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="#1f6e48" stroke="#fff" stroke-width="2"/>` : `<path d="M${(x - 7).toFixed(0)} ${(y - 7).toFixed(0)}l14 14m0-14l-14 14" stroke="#c25a00" stroke-width="5" stroke-linecap="round"/>`)).join("");
  const line = (t, ok) => `<div style="position:relative;font-size:30px;font-weight:700;padding:10px ${ok ? "150px" : "20px"} 10px 20px;border-radius:12px;background:#fff;border:${ok ? "5px solid #1f6e48" : "3px solid #1d2a3f55"}">${t}${ok ? `<span style="position:absolute;right:16px;top:50%;transform:translateY(-50%) rotate(-8deg);border:4px solid #154e33;color:#154e33;border-radius:8px;padding:0 10px;font-size:28px;font-weight:900">正解</span>` : ""}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:40px 56px;background:#e8f0f4;color:#1d2a3f;display:flex;gap:40px;align-items:center">
    <div style="flex:0 0 500px;display:flex;flex-direction:column;gap:12px">
      <div style="font-size:30px;color:#112f52;letter-spacing:.06em">台風の予報円</div>
      <div style="font-size:84px;font-weight:900;line-height:1.1;white-space:nowrap;color:#112f52">予報円<span style="color:#b5321f">のなか</span></div>
      <div style="font-size:34px">中心が入るのは約70%。<br>外に出る進路も3割ほど。</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">${line("約20本（全部）")}${line("約14本", 1)}${line("約10本")}</div>
    </div>
    <div style="flex:1;height:550px;border:4px solid #1d2a3f;border-radius:10px;overflow:hidden;background:#cfe2ef">
      <svg width="100%" height="100%" viewBox="0 0 460 520" xmlns="http://www.w3.org/2000/svg">
        <text x="16" y="36" font-size="26" font-weight="700" fill="#1d2a3f">🌀 20本流すと、円に入るのは？</text>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffffff55" stroke="#112f52" stroke-width="5" stroke-dasharray="14 9"/>
        ${tr}
        <circle cx="${sx}" cy="${sy}" r="14" fill="#b5321f" stroke="#fff" stroke-width="3"/>
      </svg>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
