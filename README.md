# 트렌드나우 — 실시간 검색어 + 블로거 무료 도구

서버·DB 없이 **GitHub 무료 기능만으로** 돌아가는 수익형 사이트입니다.
GitHub Actions가 1시간마다 실시간 검색어를 수집해 페이지를 자동으로 만들고, GitHub Pages가 무료로 호스팅합니다.

## 구성
| 페이지 | 역할 |
|---|---|
| `index.html` | 실시간 검색어 TOP 20 + 키워드별 뉴스 (자동 갱신) |
| `k/날짜-코드.html` | 키워드별 "실검 이유 정리" 페이지 — 매시간 새로 생겨 **검색 유입의 핵심** |
| `history.html` | 최근 7일 실검 이력, 오래 머문 키워드 |
| `tools/*.html` | 글자수 세기 · 세부키워드 조합기 · 키워드 밀도 분석 · 제목 생성기 |
| `about.html`, `privacy.html` | 애드센스 승인에 필요한 소개·개인정보처리방침 |

## 배포 (10분)
1. github.com 가입 → **New repository** → 이름 예: `trendnow` → **Public** 으로 생성
2. **Add file → Upload files** 로 이 폴더 안의 파일을 전부 업로드 (숨김 폴더 `.github` 포함 — 안 올라가면 웹에서 `.github/workflows/update.yml` 파일을 새로 만들어 내용 붙여넣기)
3. **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `/(root)` → Save
4. **Settings → Actions → General** → Workflow permissions: **Read and write** 체크 → Save
5. **Actions 탭 → "실시간 검색어 업데이트" → Run workflow** 로 첫 수집 실행
6. 1~2분 뒤 `https://내아이디.github.io/trendnow/` 접속 확인
7. `assets/config.js` 의 `siteUrl` 을 실제 주소로 바꾸면 다음 업데이트부터 `sitemap.xml` 이 자동 생성됩니다.

## 수익화
1. **검색 등록**: [구글 서치콘솔](https://search.google.com/search-console), [네이버 서치어드바이저](https://searchadvisor.naver.com)에 사이트 등록 → `sitemap.xml` 제출
2. **구글 애드센스**: 페이지가 수백 개 쌓이고 방문자가 생기면(보통 2~4주) 신청.
   승인 후 `config.js` 의 `adsenseClient` 에 `ca-pub-...` 입력, `ads.txt` 수정 → 모든 광고 자리에 자동 표시
   (애드센스는 `github.io` 하위 경로보다 **개인 도메인**에서 승인이 훨씬 잘 납니다. 연 1~2만 원 도메인 구입 후 Settings → Pages → Custom domain 연결 권장)
3. **쿠팡 파트너스**: 가입 후 배너/링크 코드를 `config.js` 의 `coupang` 에 넣고 `enabled: true` → 사이드바에 표시 + 법정 고지문 자동 표기

## 참고
- 데이터 출처: Google Trends 대한민국 급상승 검색어 RSS (무료·키 불필요)
- 뉴스는 제목·링크만 보여주고 원문으로 연결합니다(본문 복제 금지).
- Public 저장소의 Actions는 무료입니다. 혹시 GitHub가 예약 실행을 일시 중지하면(장기간 저장소 활동이 없을 때) Actions 탭에서 다시 Enable 하면 됩니다.
- 로컬 테스트: `node scripts/update.mjs`
