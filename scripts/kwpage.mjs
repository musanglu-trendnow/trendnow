// 키워드 상세 페이지(v2) 만들기 — 페이지마다 고유한 정보(순위 변화·보도 요약·재등장 기록·글감 아이디어)를 넣고,
// 내용이 얇은 페이지는 검색 제외(noindex) 처리합니다.
export const PAGE_VERSION = "2";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const unesc = (s) => String(s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const hasHangul = (s) => /[가-힣]/.test(s);
const naver = (kw) => "https://search.naver.com/search.naver?query=" + encodeURIComponent(kw);
const google = (kw) => "https://www.google.com/search?q=" + encodeURIComponent(kw);
const josa = (w, a, b) => { const c = String(w).trim().slice(-1).charCodeAt(0); if (c < 0xac00 || c > 0xd7a3) return `${a}(${b})`; return (c - 0xac00) % 28 ? a : b; };

// 검색에 내보낼 만한 페이지인지: 관련 뉴스 2건 이상 + 한국어 콘텐츠
export function isIndexable(k) {
  const news = k.news || [];
  if (news.length < 2) return false;
  const koNews = news.filter((n) => hasHangul(n.title)).length;
  return koNews >= 2 || (hasHangul(k.keyword) && koNews >= 1);
}

const STOP = new Set(["그리고", "하지만", "이번", "오늘", "내일", "어제", "관련", "공개", "발표", "기자", "뉴스", "속보", "단독", "종합", "사진", "영상", "포토", "이유", "논란", "근황", "지난", "올해", "현재", "통해", "위해", "대한", "에서", "으로", "이다", "있다", "했다", "한다", "된다", "까지", "부터", "만에", "결국", "다시", "가장"]);
// 뉴스 제목에서 자주 나온 낱말 뽑기 (키워드 자체 제외)
function topTerms(k, n = 6) {
  const kwParts = new Set(k.keyword.split(/\s+/));
  const cnt = new Map();
  for (const it of k.news || []) {
    const words = new Set((it.title.match(/[가-힣A-Za-z0-9]{2,}/g) || []).map((w) => w.replace(/(은|는|이|가|을|를|의|에|와|과|도|로|으로|에서|에게|까지|부터|라고|이라|하며|했다|한다)$/, "")));
    for (const w of words) {
      if (w.length < 2 || STOP.has(w) || kwParts.has(w) || k.keyword.toLowerCase().includes(w.toLowerCase()) || /^\d/.test(w)) continue;
      cnt.set(w, (cnt.get(w) || 0) + 1);
    }
  }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map((x) => x[0]);
}

function timelineOf(keyword, date, hist) {
  // hist: [{t, keywords:[{k,v,s}]}] 최신순
  return hist.filter((h) => h.t.startsWith(date))
    .map((h) => { const i = h.keywords.findIndex((x) => x.k === keyword); return i < 0 ? null : { t: h.t.slice(11, 16), rank: i + 1, v: h.keywords[i].v }; })
    .filter(Boolean).reverse();
}

const newsHTML = (news) => news.map((n) => `
      <a class="news" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">
        ${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
        <div><div class="t">${esc(n.title)}</div><div class="s">${esc(n.source)}</div></div></a>`).join("");

// k: {keyword, news:[{title,url,source,img}], img}, meta: {slug,date,first,last,peak,bestRank}
// ctx: {siteName, siteUrl, related:[{keyword,slug}], hist, otherDays:[{date,slug}], adsTag}
const clean = (s) => { let x = String(s ?? ""), y; for (let i = 0; i < 3 && x !== (y = unesc(x).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))); i++) x = y; return x; };

export function buildKeywordPage(k, meta, ctx) {
  k = { ...k, keyword: clean(k.keyword), news: (k.news || []).map((n) => ({ ...n, title: clean(n.title), source: clean(n.source) })) };
  const kw = k.keyword, news = k.news;
  const indexable = isIndexable(k);
  const tl = timelineOf(kw, meta.date, ctx.hist || []);
  const hours = Math.max(tl.length, 1);
  const sources = [...new Set(news.map((n) => n.source).filter(Boolean))];
  const terms = topTerms(k);
  const title = `${kw} 실시간 검색어 이유 정리 (${meta.date})`;
  const desc = (news[0]
    ? `${kw}${josa(kw, "이", "가")} ${meta.date} 실시간 검색어 최고 ${meta.bestRank}위에 오른 이유. ${sources.slice(0, 3).join("·")} 등 보도 ${news.length}건 요약과 순위 기록.`
    : `${kw}${josa(kw, "이", "가")} ${meta.date} 실시간 검색어 최고 ${meta.bestRank}위에 올랐습니다. 순위 기록과 함께 뜬 검색어.`).slice(0, 155);

  // 보도 요약 문단 (뉴스 제목을 출처와 함께 인용)
  let summary;
  if (news.length) {
    const lead = news.slice(0, 3).map((n) => `${esc(n.source)}${josa(n.source, "은", "는")} <b>“${esc(n.title)}”</b>`);
    summary = `<p>‘${esc(kw)}’에 대해 ${sources.length}곳의 매체가 ${news.length}건을 보도했습니다. ${lead.join(", ")}라는 제목으로 소식을 전했습니다.</p>`;
    if (terms.length) summary += `<p>보도 제목에 함께 많이 쓰인 말은 <b>${terms.slice(0, 4).map(esc).join(", ")}</b>입니다. 검색하는 사람들은 주로 이와 관련된 내용을 궁금해하는 것으로 볼 수 있습니다.</p>`;
  } else {
    summary = `<p>‘${esc(kw)}’ 검색량이 급증했지만, 수집 시점에는 관련 보도가 함께 집계되지 않았습니다. 아래 검색 버튼으로 최신 소식을 확인해 보세요.</p>`;
  }
  const f = meta.first.slice(11, 16), l = meta.last.slice(11, 16);
  const stay = f === l
    ? `<p>${esc(meta.date)} ${esc(f)} 무렵 실시간 검색어에 올라 최고 ${meta.bestRank}위·검색량 ${esc(meta.peak)}을 기록했습니다.</p>`
    : `<p>${esc(meta.date)} ${esc(f)}에 처음 순위에 올라 ${esc(l)}까지 ${tl.length > 1 ? `약 ${hours}시간 동안 ` : ""}실시간 검색어에 머물렀고, 최고 ${meta.bestRank}위·검색량 ${esc(meta.peak)}을 기록했습니다.</p>`;

  const timeline = tl.length > 1 ? `
    <h2>시간대별 순위 변화</h2>
    <table class="t"><thead><tr><th>시각(KST)</th><th>순위</th><th>검색량</th></tr></thead><tbody>
    ${tl.map((x) => `<tr><td>${esc(x.t)}</td><td>${x.rank}위</td><td>${esc(x.v)}</td></tr>`).join("")}
    </tbody></table>` : "";

  const others = (ctx.otherDays || []).filter((d) => d.slug !== meta.slug).slice(0, 10);
  const againHTML = others.length ? `
    <h2>이전에도 실검에 오른 날</h2>
    <p>‘${esc(kw)}’${josa(kw, "은", "는")} 이번이 처음이 아닙니다. 아래 날짜에도 실시간 검색어에 올랐습니다.</p>
    <div class="chips">${others.map((d) => `<a href="${d.slug}.html">${esc(d.date)}</a>`).join("")}</div>` : "";

  const ideas = [`${kw} 이유`, `${kw} 정리`, ...terms.slice(0, 4).map((t) => `${kw} ${t}`)];
  const ideasHTML = `
    <h2>블로그 글감 아이디어</h2>
    <p>이 키워드로 글을 쓴다면 아래처럼 구체적인 조합을 제목에 넣어 보세요. 검색하는 사람의 궁금증과 바로 맞닿아 있습니다.</p>
    <div class="chips">${ideas.map((t) => `<a href="../tools/title.html?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>`;

  const related = ctx.related || [];
  const relHTML = related.length ? `<div class="card"><h2>함께 뜬 실시간 검색어</h2>
    <p class="sub">같은 시간대에 ${related.slice(0, 3).map((r) => `‘${esc(r.keyword)}’`).join(", ")} 등도 함께 검색어에 올랐습니다.</p>
    <div class="chips">${related.map((r) => `<a href="${r.slug}.html">${esc(r.keyword)}</a>`).join("")}</div></div>` : "";

  return `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="silgeom-v" content="${PAGE_VERSION}">
${indexable ? "" : `<meta name="robots" content="noindex,follow">`}
<title>${esc(title)} - ${esc(ctx.siteName)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${k.img ? `<meta property="og:image" content="${esc(k.img)}">` : ""}
${ctx.siteUrl ? `<link rel="canonical" href="${ctx.siteUrl}/k/${meta.slug}.html">` : ""}
<link rel="stylesheet" href="../assets/style.css">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: title, datePublished: meta.first, dateModified: meta.last, description: desc })}</script>
${ctx.adsTag || ""}
</head>
<body data-root="../" data-page="">
<div class="wrap grid"><main>
  <div class="ad-slot" data-slot="top"></div>
  <article class="card prose">
    <div class="sub">${esc(meta.date)} · 최초 등장 ${esc(meta.first.slice(11, 16))} · 최근 ${esc(meta.last.slice(11, 16))} (KST)</div>
    <h1>${esc(kw)} — 실시간 검색어 이유</h1>
    <p class="sub">최고 검색량 ${esc(meta.peak)} · 최고 순위 ${meta.bestRank}위${news.length ? ` · 관련 보도 ${news.length}건` : ""}</p>
    <div class="row"><a class="btn" href="${naver(kw)}" target="_blank" rel="noopener">네이버에서 검색</a>
    <a class="btn ghost" href="${google(kw)}" target="_blank" rel="noopener">구글에서 검색</a>
    <a class="btn ghost" href="../tools/title.html?q=${encodeURIComponent(kw)}">이 키워드로 블로그 제목 만들기</a></div>
    <h2 style="margin-top:20px">왜 화제인가요?</h2>
    ${summary}
    ${stay}
    <div class="ad-slot" data-slot="middle"></div>
    ${timeline}
    ${news.length ? `<h2>관련 뉴스</h2>\n    <div class="news-block">${newsHTML(news)}</div>` : ""}
    ${againHTML}
    ${ideasHTML}
  </article>
  ${relHTML}
</main><aside class="side"></aside></div>
<script src="../assets/config.js"></script><script src="../assets/common.js"></script>
</body></html>`;
}

// 예전(v1) 페이지 HTML에서 다시 만들 재료 꺼내기
export function parseOldPage(html, slug) {
  const pick = (re) => { const m = html.match(re); return m ? unesc(m[1]) : ""; };
  const keyword = pick(/<h1>([\s\S]*?) — 실시간 검색어 이유<\/h1>/);
  if (!keyword) return null;
  const sub = html.match(/<div class="sub">(\d{4}-\d{2}-\d{2}) · 최초 등장 (\d{2}:\d{2}) · 최근 (\d{2}:\d{2})/);
  const date = sub ? sub[1] : `${slug.slice(0, 4)}-${slug.slice(4, 6)}-${slug.slice(6, 8)}`;
  const peak = pick(/최고 검색량 ([^ ·<]+)/) || "";
  const bestRank = parseInt(pick(/최고 순위 (\d+)위/)) || 0;
  const news = [...html.matchAll(/<a class="news" href="([^"]*)"[^>]*>\s*(?:<img src="([^"]*)"[^>]*>)?\s*<div><div class="t">([\s\S]*?)<\/div><div class="s">([\s\S]*?)<\/div><\/div><\/a>/g)]
    .map((m) => ({ url: unesc(m[1]), img: unesc(m[2] || ""), title: unesc(m[3]), source: unesc(m[4]) }));
  const related = [...(html.match(/<h2>함께 뜬 실시간 검색어<\/h2>[\s\S]*?<\/div><\/div>/) || [""])[0].matchAll(/<a href="([^"]+)\.html">([\s\S]*?)<\/a>/g)]
    .map((m) => ({ slug: m[1], keyword: unesc(m[2]) }));
  return {
    k: { keyword, news, img: pick(/<meta property="og:image" content="([^"]*)">/) },
    meta: { slug, date, first: `${date} ${sub ? sub[2] : "00:00"}`, last: `${date} ${sub ? sub[3] : "00:00"}`, peak, bestRank },
    related,
  };
}
