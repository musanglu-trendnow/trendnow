// =============================================
//  사이트 설정 — 이 파일만 고치면 됩니다
// =============================================
window.SITE_CONFIG = {
  siteName: "트렌드나우",
  siteUrl: "https://musanglu-trendnow.github.io/trendnow", // 배포 후 실제 주소로 변경

  // 1) 구글 애드센스 — 승인 후 'ca-pub-...' 값을 넣으면 모든 광고 자리에 자동 표시
  adsenseClient: "",          // 예: "ca-pub-1234567890123456"
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
  }
};
