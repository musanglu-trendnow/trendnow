// 실시간 검색어 수집 & 정적 페이지 생성
// 실행: node scripts/update.mjs   (Node 18+, 외부 패키지 불필요)
// GitHub Actions가 1시간마다 자동 실행합니다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildKeywordPage, parseOldPage, PAGE_VERSION } from "./kwpage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const FEED = "https://trends.google.com/trending/rss?geo=KR";
const cfgText = fs.readFileSync(P("assets/config.js"), "utf8");
const SITE_URL = (process.env.SITE_URL || (cfgText.match(/siteUrl:\s*"([^"]+)"/) || [])[1] || "").replace(/\/$/, "");
const ADSENSE = (cfgText.match(/adsenseClient:\s*"(ca-pub-\d+)"/) || [])[1] || "";
const ADS_TAG = ADSENSE ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>` : "";
// 모든 HTML <head>에 애드센스 코드가 없으면 넣기 (사이트 확인·자동광고용, 이미 있으면 건너뜀)
function ensureAdsenseTag() {
  if (!ADS_TAG) return;
  const dirs = [".", "tools", "k"];
  for (const d of dirs) {
    let files = [];
    try { files = fs.readdirSync(P(d)).filter((f) => f.endsWith(".html")); } catch { continue; }
    for (const f of files) {
      const fp = P(d, f);
      const html = fs.readFileSync(fp, "utf8");
      if (html.includes("adsbygoogle.js") || !html.includes("</head>")) continue;
      fs.writeFileSync(fp, html.replace("</head>", ADS_TAG + "\n</head>"));
    }
  }
}
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
  // 예전 버그로 END 표시가 여러 개 남은 경우: START부터 마지막 END까지 통째로 교체
  const S = `<!--${name}:START-->`, E = `<!--${name}:END-->`;
  const a = html.indexOf(S), b = html.lastIndexOf(E);
  if (a < 0 || b < a) return html;
  // 함수가 아닌 문자열 치환은 "$2" 같은 글자를 특수기호로 해석하므로 직접 이어 붙임
  return html.slice(0, a) + S + content + E + html.slice(b + E.length);
}

// 같은 키워드의 날짜별 페이지 묶기 (파일명 끝 6자리 = 키워드 해시)
function daysByKeyword() {
  const map = new Map();
  for (const f of fs.readdirSync(P("k"))) {
    const m = f.match(/^(\d{8})-([0-9a-f]{6})\.html$/);
    if (!m) continue;
    const arr = map.get(m[2]) || [];
    arr.push({ slug: `${m[1]}-${m[2]}`, date: `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}` });
    map.set(m[2], arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => (a.slug < b.slug ? 1 : -1));
  return map;
}

// 예전 형식 키워드 페이지를 새 형식으로 다시 만들기 (이미 바뀐 페이지는 건너뜀)
function upgradeOldPages(hist, days) {
  let n = 0;
  for (const f of fs.readdirSync(P("k"))) {
    if (!f.endsWith(".html")) continue;
    const fp = P("k", f);
    const html = fs.readFileSync(fp, "utf8");
    if (html.includes(`name="silgeom-v" content="${PAGE_VERSION}"`)) continue;
    const slug = f.slice(0, -5);
    const d = parseOldPage(html, slug);
    if (!d) continue;
    const otherDays = days.get(slug.slice(9)) || [];
    fs.writeFileSync(fp, buildKeywordPage(d.k, d.meta, { siteName: SITE_NAME, siteUrl: SITE_URL, related: d.related, hist, otherDays, adsTag: ADS_TAG }));
    n++;
  }
  if (n) console.log(`키워드 페이지 ${n}개를 새 형식으로 변환`);
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
  const days = daysByKeyword();
  top.forEach((k) => {
    const meta = kwIndex[k.keyword];
    const related = top.filter((x) => x.keyword !== k.keyword).slice(0, 12).map((x) => ({ keyword: x.keyword, slug: kwIndex[x.keyword].slug }));
    const otherDays = days.get(meta.slug.slice(9)) || [];
    fs.writeFileSync(P("k", meta.slug + ".html"), buildKeywordPage(k, meta, { siteName: SITE_NAME, siteUrl: SITE_URL, related, hist, otherDays, adsTag: ADS_TAG }));
  });
  upgradeOldPages(hist, days);

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
    const kws = fs.readdirSync(P("k")).filter((f) => /^\d{8}-[0-9a-f]{6}\.html$/.test(f))
      .filter((f) => !fs.readFileSync(P("k", f), "utf8").includes('content="noindex'))
      .map((f) => ({ slug: f.slice(0, -5), date: `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}` }))
      .sort((a, b) => (a.slug < b.slug ? 1 : -1)).slice(0, 5000);
    const urls = [
      ...fixed.map((u) => `<url><loc>${SITE_URL}/${u === "index.html" ? "" : u}</loc><lastmod>${ymd}</lastmod></url>`),
      ...kws.map((m) => `<url><loc>${SITE_URL}/k/${m.slug}.html</loc><lastmod>${m.date}</lastmod></url>`),
    ];
    fs.writeFileSync(P("sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
    fs.writeFileSync(P("robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  }
  ensureAdsenseTag();
  console.log(`OK ${stamp} · ${top.length}개 키워드 · 1위 ${top[0].keyword}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
