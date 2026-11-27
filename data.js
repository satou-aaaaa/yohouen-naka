// 予報円のなかの問題を作る（ブラウザと node の両方で使う）。
// 中身は、気象庁「台風情報の種類と表現方法」「予報用語 台風」に書いてあることと、それをもとにした練習用のしくみだけ
// （2026-11-27 に読んだ。要点は共有フォルダ games/yohouen-naka-research.md）。
// 予報円は「予報した時刻に、この円内に台風の中心が入る確率は70％」の円。円の大きさは台風の大きさではなく、進路予報の不確実性。
// しくみ（目安。気象庁の計算方法ではない）：進路のずれを、円の中心から東西・南北それぞれ同じはばの正規分布で置く。
// 半径が予報円の k 倍の円に入る割合は 1 − 0.3^(k²)（k=1 で70%・k=2 で約99%・k=0.5 で約26%）。
// 問題の進路は、ずれの大きさが分布どおりに並ぶように選ぶ（入る本数がいつも70%に近くなる）。「ためす」はふつうの乱数で流す。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題・同じ進路になる。
// KINDS・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる（選ぶ範囲が変わるため）。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    joho: ["気象庁「台風情報の種類と表現方法」", "https://www.jma.go.jp/jma/kishou/know/typhoon/7-1.html"],
    yougo: ["気象庁「予報用語 台風」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/haichi2.html"],
  };
  const P70 = 0.7;
  // 半径が予報円の k 倍の円に、台風の中心が入る割合（2次元の正規分布：1 − exp(−r²/2σ²)。予報円の半径は70%になる所）
  const pin = (k) => 1 - Math.pow(1 - P70, k * k);
  // n 本のうち入る本数の目安
  const expect = (n, k) => Math.round(n * pin(k));
  // u（0〜1）のずれの大きさ（予報円の半径を1とする）。u = 0.7 でちょうど1
  const radOf = (u) => Math.sqrt(Math.log(1 - u) / Math.log(1 - P70));

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end

  // 進路の終わり（予報した時刻の中心）n 本。x・y は予報円の半径を1とした、円の中心からのずれ。bend は道のりの曲がり（図だけに使う）
  // ずれの大きさは (i + U) / n の分位で並べる（U は 0.25〜0.75）。向きはばらばら
  function tracks(R, n) {
    const U = 0.25 + R() * 0.5, out = [];
    for (let i = 0; i < n; i++) { const r = radOf((i + U) / n), a = R() * Math.PI * 2, bend = R() * 2 - 1; out.push({ x: r * Math.cos(a), y: r * Math.sin(a), r, bend }); }
    return shuffle(R, out);
  }
  // ふつうの乱数で1本（「ためす」用）。Box–Muller。σ は予報円の半径の 1/1.552
  const SIG = 1 / Math.sqrt(-2 * Math.log(1 - P70));
  function gauss(R) { const u = Math.max(R(), 1e-12), v = R(), m = Math.sqrt(-2 * Math.log(u)) * SIG; return { x: m * Math.cos(2 * Math.PI * v), y: m * Math.sin(2 * Math.PI * v) }; }

  // 2段目「この線・円は、何を表す？」の4つ
  const GROUPS = {
    in70: { name: "中心が約70%で入る範囲", sub: "外に出ることも3割ほど" },
    kanarazu: { name: "中心が必ず入る範囲", sub: "外には出ない" },
    ookisa: { name: "台風の大きさ", sub: "強い風がふく広さ" },
    keikai: { name: "暴風域に入るおそれのある範囲", sub: "中心が円の中に進んだとき" },
  };
  const GRP_WHY = {
    in70: "予報円は、その時刻に台風の中心が入る確率がおよそ70%の範囲です。円の大きさは台風の大きさではありません。",
    kanarazu: "",
    ookisa: "",
    keikai: "赤い線（暴風警戒域）は、台風の中心が予報円の中に進んだとき、暴風域に入るおそれのある範囲です。",
  };
  const ASK = {
    in70: "点線の円（予報円）は、何を表す？",
    keikai: "赤い線で囲んだ所は、何を表す？",
  };
  const MEDIA = { scene: "進路の図", kimari: "予報円の決まり", kikan: "予報の時間" };
  const HRS = [24, 48, 72, 96, 120];
  const DIRS = ["北", "北東", "北西"];

  // 本数の選び肢：答えと、よくある思いちがい（全部入る・半分・円が半分なら割合も半分 など）。数どうしは n の1割以上（2本以上）はなす
  const MISS = [1, 0.5, 0.3, 0.9, 0.35, 0.1, 0.6, 0.8];
  function options(R, n, ans, cnt) {
    const gap = Math.max(2, Math.round(n * 0.1)), out = [ans];
    for (const f of [...shuffle(R, MISS.slice(0, 4)), ...shuffle(R, MISS.slice(4))]) {
      if (out.length >= cnt) break;
      const v = Math.round(n * f);
      if (v < 0 || v > n || out.some((o) => Math.abs(o - v) < gap)) continue;
      out.push(v);
    }
    return out;
  }
  const lab = (v) => `約${v}本`;
  // 場面の問題。o：{ ns:本数の候補, k:円の倍率, out:外に出た本数を問う, hrs:時刻の候補, red:暴風警戒域を描く, close:選び肢を近くする }
  function scene(o) {
    const SIT = o.out ? [
      (n, h, d) => `${d}へ進む台風。${h}時間後の予報円。台風を${n}本流すと、円の外に出るのは？`,
      (n, h, d) => `${h}時間後の予報円です（${d}へ進む）。${n}本の進路のうち、外に出るのは何本くらい？`,
      (n, h, d) => `同じ予報の台風を${n}本。${h}時間後、円の外に出るのは？（${d}へ進む）`,
    ] : o.k !== 1 ? [
      (n, h, d) => `${h}時間後の予報円（点線）と、半径${o.k === 2 ? "2倍" : "半分"}の円（太線）。${n}本流すと、太線の円に入るのは？（${d}へ進む）`,
      (n, h, d) => `${d}へ進む台風。点線が${h}時間後の予報円、太線は半径${o.k === 2 ? "2倍" : "半分"}の円。${n}本のうち太線に入るのは？`,
      (n, h, d) => `半径を${o.k === 2 ? "2倍" : "半分"}にした円（太線）。${h}時間後、${n}本の台風のうち中に入るのは？（${d}へ進む）`,
    ] : [
      (n, h, d) => `${d}へ進む台風。${h}時間後の予報円。台風を${n}本流すと、円に入るのは？`,
      (n, h, d) => `${h}時間後の予報円です（${d}へ進む）。${n}本の進路のうち、円に入るのは何本くらい？`,
      (n, h, d) => `同じ予報の台風を${n}本。${h}時間後、中心が円に入るのは？（${d}へ進む）`,
    ];
    return (R, lv) => {
      const n = o.ns[ri(R, 0, o.ns.length - 1)], hr = o.hrs[ri(R, 0, o.hrs.length - 1)], dir = ri(R, 0, DIRS.length - 1), si = ri(R, 0, SIT.length - 1);
      const inN = expect(n, o.k), a = o.out ? n - inN : inN;
      const vs = shuffle(R, options(R, n, a, lv === 0 ? 3 : 4)), tr = tracks(R, n);
      const real = tr.filter((t) => t.r <= o.k).length, pct = Math.round(pin(o.k) * 100);
      const what = o.k === 1 ? "予報円" : `半径${o.k === 2 ? "2倍" : "半分"}の円`;
      return {
        type: "act", media: MEDIA.scene, q: SIT[si](n, hr, DIRS[dir]), opts: vs.map(lab), ans: lab(a), rev: false, v: `${n}.${hr}.${dir}.${si}`,
        sim: { n, hr, dir, k: o.k, out: !!o.out, red: !!o.red, tr, real }, grp: o.red ? "keikai" : "in70",
        name: `${n}本・${what}：${lab(a)}${o.out ? "が外" : ""}`,
        look: o.k === 1 ? "予報円に中心が入る確率を思い出しましょう。" : `${o.k === 2 ? "広い" : "せまい"}円です。割合は面積の割合とはちがいます。`,
        key: o.k === 1 ? `予報円に入るのは約70%、外は約30%です。` : `半径${o.k === 2 ? "2倍の円には約99%" : "半分の円には約26%"}が入ります（目安）。`,
        why: o.k === 1
          ? `予報円は中心が約70%で入る円。${n}本なら約${inN}本が入り、約${n - inN}本は外に出ます。${hr >= 96 ? "円が大きくても割合は同じです。" : ""}`
          : `ずれは中心の近くに多く、遠くは少しです。半径${o.k === 2 ? "2倍" : "半分"}の円には約${pct}%、${n}本なら約${inN}本です（目安）。`,
      };
    };
  }
  const T = (id, lv, name, look, o) => ({ id, lv, a: 0, ans: "", grp: "scene", col: "scene", name, look, key: "", why: "", src: ["joho", "yougo"], make: scene(o), o });

  // 決まりの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, rev: false, v: `${si}:${ds.map((x) => ws.indexOf(x)).join(".")}` };
    };
  }
  const F = (id, lv, col, src, name, look, key, why, sit, ans, ws) => ({ id, lv, a: -1, ans, grp: null, col, name, look, key, why, src, make: fact(col, sit, ans, ws) });

  const KINDS = [
    // ---- やさしい ----
    T("kazu10", 0, "10本の台風", "予報円に入る割合を思い出しましょう。", { ns: [10], k: 1, hrs: HRS }),
    T("kazu20", 0, "20本の台風", "円の外に出る台風もあります。", { ns: [20], k: 1, hrs: HRS }),
    F("kakuritsu", 0, "kimari", ["joho", "yougo"], "予報円に入る確率は約70%", "100%ではありません。", "予報した時刻に、円内に中心が入る確率は70％。",
      "気象庁の説明では、予報した時刻に、予報円の中に台風の中心が入る確率は70%です。",
      ["予報円に、台風の中心が入る確率は？", "予報した時刻に、台風の中心が予報円に入る確率は？", "気象庁の説明で、中心が予報円に入る確率は？"], "約70%", ["100%", "約50%", "約30%", "約10%", "約99%"]),
    F("chushin", 0, "kimari", ["joho", "yougo"], "予報円に入るのは台風の中心", "台風のどこの位置かです。", "予報円は、台風の中心が到達すると予想される範囲。",
      "気象庁の説明では、予報円は台風の中心が到達すると予想される範囲です。雨や風の範囲ではありません。",
      ["予報円に入ると予想しているのは、台風のどこ？", "予報円が示すのは、台風の何が来る範囲？", "予報円の中に入るのは？"], "台風の中心", ["台風の雲の全部", "強い風がふく範囲の全部", "雨がふる範囲の全部", "台風の目のまわりの雷"]),
    F("soto3", 0, "kimari", ["joho"], "円の外に出ることも3割ほど", "70%の残りです。", "円内に入る確率が70%なので、外に出ることも約30%あります。",
      "予報円に中心が入る確率は70%。残りの約30%（10回に3回ほど）は、中心が円の外に出ます。",
      ["台風の中心が、予報円の外に出ることは？", "予報円の外に、台風の中心が進むことはある？", "中心が予報円から外れるのは、どのくらい？"], "10回に3回ほどある", ["一度も無い", "100回に1回もない", "いつも半分は外", "10回に9回は外"]),
    // ---- ふつう ----
    T("soto20", 1, "外に出る台風", "入らない割合です。", { ns: [20, 30], k: 1, hrs: HRS, out: true }),
    T("kazu40", 1, "暴風警戒域のある図", "赤い線ではなく、点線の円に入る本数です。", { ns: [30, 40], k: 1, hrs: [48, 72, 96], red: true }),
    T("hiroi", 1, "5日先の大きな円", "円が大きくても、割合は同じです。", { ns: [20, 30], k: 1, hrs: [96, 120] }),
    F("ookisa", 1, "kimari", ["joho"], "円の大きさは進路の不確実性", "台風の大きさではありません。", "予報円の大きさは、台風の大きさの変化ではなく、進路予報の不確実性。",
      "気象庁の説明では、予報円の大きさは台風の大きさの変化を表すものではなく、進路予報の不確実性を表します。",
      ["予報円が大きいのは、何を表す？", "先の予報円ほど大きい。これは何のちがい？", "予報円の大きさが表すのは？"], "進路の予報のはば（不確実性）", ["台風が大きくなること", "台風が強くなること", "雨の量が増えること", "風が弱まること"]),
    F("keikaiiki", 1, "kimari", ["joho", "yougo"], "暴風警戒域は暴風域に入るおそれのある範囲", "赤い線で囲んだ所です。", "暴風警戒域は、中心が予報円内に進んだとき暴風域に入るおそれのある範囲。",
      "気象庁の説明では、暴風警戒域は、台風の中心が予報円内に進んだとき、暴風域に入るおそれのある範囲です。",
      ["暴風警戒域とは？", "予報円の外側を囲む赤い線の中は？", "地図の赤い線（暴風警戒域）が示すのは？"], "暴風域に入るおそれのある範囲", ["台風の中心が必ず通る道", "雨がもうやんだ範囲", "風がまったくふかない範囲", "台風が生まれた場所"]),
    F("sen", 1, "kimari", ["joho"], "中心を結んだ線の上を進むとは限らない", "線は予報円の中心をつないだだけです。", "台風の中心が必ずしもこの線に沿って進むわけではない。",
      "気象庁の説明では、予報円の中心を結んだ線を表示できますが、台風の中心が必ずしもこの線に沿って進むわけではありません。",
      ["予報円の中心を結んだ線。台風の中心は？", "予報円の真ん中をつないだ線について、正しいのは？", "円の中心を結んだ点線の上を、台風は進む？"], "この線の上を進むとは限らない", ["必ずこの線の上を進む", "この線より東は通らない", "この線から100km以上は外れない", "線の上だけが風が強い"]),
    // ---- むずかしい ----
    T("kazu100", 2, "100本の台風", "7割のあたりの数です。", { ns: [50, 100], k: 1, hrs: HRS }),
    T("nibai", 2, "半径2倍の円", "半径2倍でも、割合は2倍になりません。", { ns: [20, 30], k: 2, hrs: [24, 48] }),
    T("hanbun", 2, "半径半分の円", "半径が半分でも、割合は半分になりません。", { ns: [20, 30, 40], k: 0.5, hrs: HRS }),
    T("soto50", 2, "暴風警戒域と外に出る台風", "点線の円の外に出る本数です。", { ns: [50], k: 1, hrs: [48, 72, 96], out: true, red: true }),
    F("saki", 2, "kikan", ["joho"], "先の時刻ほど予報円は大きい", "先のことほど、ずれうるはばが広がります。", "一般に、発表時刻から先の時間になるほど予報円が大きくなります。",
      "気象庁の説明では、一般に、情報の発表時刻から先の時間になるほど予報円は大きくなります。進路のはばが広がるためです。",
      ["先の時刻の予報円ほど、どうなる？", "1日後と5日後の予報円。一般に大きいのは？", "時間がたつほど、予報円の大きさは？"], "先の時刻ほど大きくなる", ["先の時刻ほど小さくなる", "いつも同じ大きさ", "台風が弱まると円は消える", "大きさは毎回でたらめ"]),
    F("itsuka", 2, "kikan", ["joho"], "進路の予報は5日（120時間）先まで", "1日・2日…と先まで出ます。", "5日（120時間）先までの24時間刻みの予報を、6時間ごとに発表。",
      "気象庁は、台風の5日（120時間）先までの予報を、24時間刻みで6時間ごとに発表します。",
      ["気象庁の台風の進路予報は、何日先まで？", "予報円は、どこまで先の時刻まで出る？", "台風の進路予報の、いちばん先の時刻は？"], "5日（120時間）先まで", ["1日（24時間）先まで", "2日（48時間）先まで", "10日先まで", "1か月先まで"]),
    F("kizami", 2, "kikan", ["joho"], "1日先までは12時間刻み", "近い時刻ほど、こまかく出ます。", "1日（24時間）先までの12時間刻みの予報は、3時間ごとに発表。",
      "気象庁は、1日（24時間）先までは12時間刻みの予報を3時間ごとに、5日先までは24時間刻みの予報を6時間ごとに発表します。",
      ["1日（24時間）先までの予報円は、何時間刻み？", "24時間先までの進路予報の刻みは？", "近い時刻（1日先まで）の予報円の刻みは？"], "12時間刻み", ["1時間刻み", "48時間刻み", "72時間刻み", "1週間刻み"]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "kazu20|2026-11-27:d2"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    const P = { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: null, src: k.src.map((s) => SRC[s]), ...p };
    P.gwhy = P.grp ? GRP_WHY[P.grp] : "";
    P.ask2 = P.grp ? ASK[P.grp] : "";
    return P;
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const YHN = { KINDS, BY, GROUPS, GRP_WHY, ASK, LV, SRC, MEDIA, HRS, DIRS, P70, SIG, pin, expect, radOf, tracks, gauss, lab, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = YHN; else root.YHN = YHN;
})(typeof self !== "undefined" ? self : this);
