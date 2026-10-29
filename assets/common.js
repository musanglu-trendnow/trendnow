// 공통: 헤더·푸터·사이드바·광고 삽입
(function () {
  const C = window.SITE_CONFIG || {};
  const R = document.body.dataset.root || "./";
  const page = document.body.dataset.page || "";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.esc = esc;

  const MENU = [
    ["home", "index.html", "실시간 검색어"],
    ["history", "history.html", "실검 이력"],
    ["count", "tools/count.html", "글자수 세기"],
    ["combine", "tools/combine.html", "세부키워드 조합기"],
    ["density", "tools/density.html", "키워드 밀도 분석"],
    ["title", "tools/title.html", "블로그 제목 생성기"],
  ];

  const header = document.createElement("header");
  header.className = "top";
  header.innerHTML = `<div class="wrap"><a class="logo" href="${R}index.html"><b>●</b> ${esc(C.siteName || "트렌드나우")}</a>
    <nav class="menu">${MENU.map(([k, h, t]) => `<a href="${R}${h}" class="${k === page ? "on" : ""}">${t}</a>`).join("")}</nav></div>`;
  document.body.prepend(header);

  // 사이드바
  const side = document.querySelector(".side");
  if (side) {
    side.insertAdjacentHTML("afterbegin", `
      <div class="ad-slot" data-slot="side"></div>
      <div class="card"><h2>블로거 무료 도구</h2><div class="tool-list">
        <a href="${R}tools/count.html">글자수 세기<small>공백 포함/제외, 바이트 수</small></a>
        <a href="${R}tools/combine.html">세부키워드 조합기<small>지역·수식어 조합으로 롱테일 키워드</small></a>
        <a href="${R}tools/density.html">키워드 밀도 분석<small>반복 단어·키워드 비중 확인</small></a>
        <a href="${R}tools/title.html">블로그 제목 생성기<small>클릭을 부르는 제목 패턴</small></a>
      </div></div>
      <div class="coupang-box"></div>`);
  }

  const footer = document.createElement("footer");
  footer.innerHTML = `<div class="wrap">
    <a href="${R}about.html">사이트 소개</a><a href="${R}privacy.html">개인정보처리방침</a><a href="${R}history.html">실검 이력</a>
    <p>검색 트렌드 데이터: Google Trends · 뉴스 저작권은 각 언론사에 있습니다.<br>© ${new Date().getFullYear()} ${esc(C.siteName || "")}</p></div>`;
  document.body.append(footer);

  // ---------- 광고 ----------
  function renderAds() {
    const client = C.adsenseClient;
    if (client) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      s.crossOrigin = "anonymous";
      document.head.append(s);
      document.querySelectorAll(".ad-slot").forEach((el) => {
        const slotId = (C.adsenseSlots || {})[el.dataset.slot];
        if (!slotId) return; // 단위 ID 없으면 자동광고에 맡김
        el.innerHTML = `<div class="ad-label">광고</div><ins class="adsbygoogle" style="display:block" data-ad-client="${client}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    }
    const cp = C.coupang || {};
    if (cp.enabled) {
      const html = `<div class="card"><h2>오늘의 추천</h2>
        ${cp.bannerHtml || ""}
        <div class="cp-links">${(cp.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="sponsored noopener">${esc(l.title)} →</a>`).join("")}</div>
        <p class="disclose">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p></div>`;
      document.querySelectorAll(".coupang-box").forEach((el) => (el.innerHTML = html));
    }
  }
  renderAds();
})();
