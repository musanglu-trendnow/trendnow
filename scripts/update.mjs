// 실시간 검색어 수집 & 정적 페이지 생성
// 실행: node scripts/update.mjs   (Node 18+, 외부 패키지 불필요)
// GitHub Actions가 1시간마다 자동 실행합니다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const FEED = "https://trends.google.com/trending/rss?geo=KR";
const cfgText = fs.readFileSync(P("assets/config.js"), "utf8");
const SITE_URL = (process.env.SITE_URL || (cfgText.match(/siteUrl:\s*"([^"]+)"/) || [])[1] || "").replace(/\/$/, "");
const SITE_NAME = (cfgText.match(/siteName:\s*"([^"]+)"/) || [])[1] || "트렌드나우";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const unxml = (s) => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? unxml(m[1]) : ""; };
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const traffic = (t) => parseInt(String(t).replace(/[^0-9]/g, "")) || 0;

// KST 시각
const now = new Date();
const kst = new Date(now.getTime() + 9 * 3600e3);
const ymd = kst.toISOString().slice(0, 10);
const stamp = kst.toISOString().slice(0, 16).replace("T", " ");

async function fetchFeed() {
  if (process.env.FEED_FILE) return parse(fs.readFileSync(process.env.FEED_FILE, "utf8")); // 로컬 테스트용
  const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (trendnow bot)" } });
  if (!res.ok) throw new Error("feed " + res.status);
  return parse(await res.text());
}
function parse(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const it = m[1];
    const news = [...it.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map((n) => ({
      title: tag(n[1], "ht:news_item_title"),
      url: tag(n[1], "ht:news_item_url"),
      source: tag(n[1], "ht:news_item_source"),
      img: tag(n[1], "ht:news_item_picture"),
    })).filter((n) => n.title && /^https?:/.test(n.url));
    return {
      keyword: tag(it, "title"),
      traffic: tag(it, "ht:approx_traffic"),
      pubDate: tag(it, "pubDate"),
      img: tag(it, "ht:picture"),
      news,
    };
  }).filter((x) => x.keyword);
  // 검색량 큰 순 정렬
  items.sort((a, b) => traffic(b.traffic) - traffic(a.traffic));
  return items;
}

const slugOf = (kw) => ymd.replace(/-/g, "") + "-" + crypto.createHash("md5").update(kw).digest("hex").slice(0, 6);
const naver = (kw) => "https://search.naver.com/search.naver?query=" + encodeURIComponent(kw);
const google = (kw) => "https://www.google.com/search?q=" + encodeURIComponent(kw);
const newsHTML = (news) => news.map((n) => `
      <a class="news" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">
        ${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
        <div><div class="t">${esc(n.title)}</div><div class="s">${esc(n.source)}</div></div></a>`).join("");

function keywordPage(k, meta, related) {
  const title = `${k.keyword} 실시간 검색어 이유 정리 (${meta.date})`;
  const desc = `${k.keyword}이(가) 실시간 검색어에 오른 이유와 관련 최신 뉴스 ${k.news.length}건을 정리했습니다. ${k.news[0] ? k.news[0].title : ""}`.slice(0, 155);
  return `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} - ${esc(SITE_NAME)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${k.img ? `<meta property="og:image" content="${esc(k.img)}">` : ""}
${SITE_URL ? `<link rel="canonical" href="${SITE_URL}/k/${meta.slug}.html">` : ""}
<link rel="stylesheet" href="../assets/style.css">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: title, datePublished: meta.first, dateModified: meta.last, description: desc })}</script>
</head>
<body data-root="../" data-page="">
<div class="wrap grid"><main>
  <div class="ad-slot" data-slot="top"></div>
  <article class="card">
    <div class="sub">${esc(meta.date)} · 최초 등장 ${esc(meta.first.slice(11, 16))} · 최근 ${esc(meta.last.slice(11, 16))} (KST)</div>
    <h1>${esc(k.keyword)} — 실시간 검색어 이유</h1>
    <p class="sub">최고 검색량 ${esc(meta.peak)} · 최고 순위 ${meta.bestRank}위</p>
    <div class="row"><a class="btn" href="${naver(k.keyword)}" target="_blank" rel="noopener">네이버에서 검색</a>
    <a class="btn ghost" href="${google(k.keyword)}" target="_blank" rel="noopener">구글에서 검색</a>
    <a class="btn ghost" href="../tools/title.html?q=${encodeURIComponent(k.keyword)}">이 키워드로 블로그 제목 만들기</a></div>
    <h2 style="margin-top:20px">왜 화제인가요?</h2>
    <p>${k.news[0] ? `${esc(k.news[0].source)} 보도에 따르면 <b>“${esc(k.news[0].title)}”</b> 소식이 전해지며 ‘${esc(k.keyword)}’ 검색량이 급증했습니다.` : `‘${esc(k.keyword)}’ 검색량이 급증했습니다.`}</p>
    <div class="ad-slot" data-slot="middle"></div>
    <h2>관련 뉴스</h2>
    <div class="news-block">${newsHTML(k.news)}</div>
  </article>
  ${related.length ? `<div class="card"><h2>함께 뜬 실시간 검색어</h2><div class="chips">${related.map((r) => `<a href="${r.slug}.html">${esc(r.keyword)}</a>`).join("")}</div></div>` : ""}
</main><aside class="side"></aside></div>
<script src="../assets/config.js"></script><script src="../assets/common.js"></script>
</body></html>`;
}

function rankHTML(list, kwIndex, prevSet) {
  return `<ol class="rank">${list.map((k, i) => `
      <li><span class="num">${i + 1}</span>
        <a class="kw" href="k/${kwIndex[k.keyword].slug}.html">${esc(k.keyword)}${prevSet.size && !prevSet.has(k.keyword) ? '<span class="badge-new">NEW</span>' : ""}</a>
        <span class="traffic">${esc(k.traffic)}</span>
        <span class="links"><a href="${naver(k.keyword)}" target="_blank" rel="noopener">네이버</a><a class="hide-m" href="${google(k.keyword)}" target="_blank" rel="noopener">구글</a></span></li>`).join("")}
    </ol>`;
}

function newsSectionHTML(list, kwIndex) {
  return list.slice(0, 10).filter((k) => k.news.length).map((k, i) => `
    <div class="news-block"><h3>${i + 1}. <a href="k/${kwIndex[k.keyword].slug}.html">${esc(k.keyword)}</a></h3>${newsHTML(k.news.slice(0, 3))}</div>`).join("");
}

function replaceBlock(html, name, content) {
  const re = new RegExp(`(<!--${name}:START-->)[\\s\\S]*?(<!--${name}:END-->)`);
  return html.replace(re, `$1${content}$2`);
}

async function main() {
  const list = await fetchFeed();
  if (!list.length) throw new Error("빈 피드");
  const top = list.slice(0, 20);

  // 키워드 인덱스 (키워드 상세 페이지 메타)
  const kwIndex = readJSON(P("data/keywords.json"), {});
  const iso = kst.toISOString().slice(0, 16).replace("T", " ");
  top.forEach((k, i) => {
    const prev = kwIndex[k.keyword];
    if (prev && prev.date === ymd) {
      prev.last = iso;
      prev.bestRank = Math.min(prev.bestRank, i + 1);
      if (traffic(k.traffic) > traffic(prev.peak)) prev.peak = k.traffic;
    } else {
      kwIndex[k.keyword] = { slug: slugOf(k.keyword), date: ymd, first: iso, last: iso, peak: k.traffic, bestRank: i + 1 };
    }
  });

  // 이력 (최근 7일, 1시간 단위 스냅샷)
  const history = readJSON(P("data/history.json"), []);
  const prevSet = new Set((history[0]?.keywords || []).map((x) => x.k));
  history.unshift({ t: stamp, keywords: top.map((k) => ({ k: k.keyword, v: k.traffic, s: kwIndex[k.keyword].slug })) });
  const cutoff = new Date(kst.getTime() - 7 * 864e5).toISOString().slice(0, 16).replace("T", " ");
  const hist = history.filter((h) => h.t >= cutoff).slice(0, 24 * 7);

  // 키워드 상세 페이지 생성
  fs.mkdirSync(P("k"), { recursive: true });
  top.forEach((k) => {
    const meta = kwIndex[k.keyword];
    const related = top.filter((x) => x.keyword !== k.keyword).slice(0, 12).map((x) => ({ keyword: x.keyword, slug: kwIndex[x.keyword].slug }));
    fs.writeFileSync(P("k", meta.slug + ".html"), keywordPage(k, meta, related));
  });

  // 메인 페이지 정적 블록 갱신 (검색엔진이 바로 읽을 수 있게)
  let index = fs.readFileSync(P("index.html"), "utf8");
  index = replaceBlock(index, "TIME", esc(stamp));
  index = replaceBlock(index, "RANK", rankHTML(top, kwIndex, prevSet));
  index = replaceBlock(index, "NEWS", newsSectionHTML(top, kwIndex));
  fs.writeFileSync(P("index.html"), index);

  fs.writeFileSync(P("data/trends.json"), JSON.stringify({ updated: stamp, items: top }, null, 1));
  fs.writeFileSync(P("data/history.json"), JSON.stringify(hist));
  fs.writeFileSync(P("data/keywords.json"), JSON.stringify(kwIndex));

  // sitemap
  if (SITE_URL && !SITE_URL.includes("YOUR-ID")) {
    const fixed = ["index.html", "history.html", "about.html", "tools/count.html", "tools/combine.html", "tools/density.html", "tools/title.html"];
    const kws = Object.values(kwIndex).sort((a, b) => (b.last > a.last ? 1 : -1)).slice(0, 5000);
    const urls = [
      ...fixed.map((u) => `<url><loc>${SITE_URL}/${u}</loc><lastmod>${ymd}</lastmod></url>`),
      ...kws.map((m) => `<url><loc>${SITE_URL}/k/${m.slug}.html</loc><lastmod>${m.date}</lastmod></url>`),
    ];
    fs.writeFileSync(P("sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
    fs.writeFileSync(P("robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  }
  console.log(`OK ${stamp} · ${top.length}개 키워드 · 1위 ${top[0].keyword}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
