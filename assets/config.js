// =============================================
//  사이트 설정 — 이 파일만 고치면 됩니다
// =============================================
window.SITE_CONFIG = {
  siteName: "실시간 검색어 순위",
  siteUrl: "https://silgeom.kr", // 배포 후 실제 주소로 변경

  // 1) 구글 애드센스 — 승인 후 'ca-pub-...' 값을 넣으면 모든 광고 자리에 자동 표시
  adsenseClient: "ca-pub-8125898337896446",          // 예: "ca-pub-1234567890123456"
  adsenseSlots: {             // 애드센스에서 만든 광고 단위 ID (없으면 자동광고만 사용)
    top: "",
    middle: "",
    side: ""
  },

  // 2) 쿠팡 파트너스 — 파트너스에서 발급받은 링크/배너 코드
  coupang: {
    enabled: true,
    // 다이나믹 배너 iframe 코드 그대로 붙여넣기 (파트너스 > 배너 > 다이나믹 배너)
    bannerHtml: '<iframe src="https://ads-partners.coupang.com/widgets.html?id=1044542&template=carousel&trackingCode=AF6720578&subId=&width=268&height=400&tsource=" width="268" height="400" frameborder="0" scrolling="no" referrerpolicy="unsafe-url" style="max-width:100%"></iframe>',
    // 또는 간단 링크 목록 (상품 링크 생성 기능으로 만든 link.coupang.com 주소)
    links: [
      // { title: "오늘의 특가 모아보기", url: "https://link.coupang.com/a/xxxxx" }
    ]
  },

  // 3) 토스쇼핑 쉐어링크 — 토스 앱 > 상품 > 공유하기 > 쉐어링크 공유하기로 받은 주소
  //    상품이 여러 개면 몇 초마다 자동으로 넘어가요. icon은 이모지, sub는 한 줄 설명
  toss: {
    enabled: true,
    title: "토스쇼핑 추천",
    interval: 4500, // 자동 넘김 간격(ms)
    links: [
      { title: "해담별 제주 흑돼지 왕구이 1.2kg × 2개", sub: "양념·가공육 3위 · 리뷰 4,023개", icon: "🥩", url: "https://toss.shopping/_m/hiawJgSp" },
      { title: "셰프초이스 제육불고기 2kg", sub: "양념·가공육 9위 · 리뷰 465개", icon: "🍖", url: "https://toss.shopping/_m/LNB1HQdi" },
      { title: "그린올린 경기미 26년산 상등급 3kg × 2개", sub: "햅쌀 · 평점 4.7", icon: "🍚", url: "https://toss.shopping/_m/FvptUIGp" },
      { title: "오즈랜드 리얼 생감자스틱 20g × 36봉", sub: "감자스낵 2위 · 평점 4.8", icon: "🥔", url: "https://toss.shopping/_m/z8KDieqD" },
      { title: "펩시 제로슈거 피치향 500ml × 18개", sub: "제로 탄산 · 평점 4.7", icon: "🥤", url: "https://toss.shopping/_m/fWCvVsYq" },
      { title: "디어커스 원데이 수세미 에코컷 100매 × 2팩", sub: "일회용수세미 2위 · 리뷰 680개", icon: "🧽", url: "https://toss.shopping/_m/NYV9Y1o8" }
    ]
  }
};
