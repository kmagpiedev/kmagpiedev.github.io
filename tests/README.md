# 까치테스트 추가 가이드

`/tests/`는 모든 까치테스트의 공식 목록 페이지입니다. 새 테스트는 아래 항목을 한 번에 반영합니다.

1. `tests/<slug>/index.html`과 테스트 전용 이미지/OG 이미지를 추가합니다.
2. `tests/index.html`의 `TEST_CARDS:START`와 `TEST_CARDS:END` 사이에 카드를 복제합니다.
3. 카드의 `data-title`, `data-category`, `data-tags`, 링크, 이미지, 제목, 설명, 태그, `data-test-id`를 바꿉니다.
4. 카드의 `itemprop="position"` 값을 목록 순서대로 업데이트합니다. 목록 구조화 데이터는 카드 HTML의 Microdata를 그대로 사용합니다.
5. `sitemap.xml`에 새 테스트 URL을 추가합니다.
6. 새 테스트 breadcrumb가 `K-magpie › 까치테스트 › 테스트명`으로 `/tests/`를 가리키는지 확인합니다.
7. canonical, OG URL/이미지, 공유 URL이 실제 공개 주소와 일치하는지 확인합니다.

테스트가 6개 이상이면 허브의 검색창과 카테고리 필터가 자동으로 나타납니다. 필터는 각 카드의 `data-category`에서 자동 생성됩니다.

썸네일은 16:9 WebP를 권장하며, 가급적 640~960px 폭으로 최적화합니다. 테스트 전용 OG 이미지는 1200×630으로 준비합니다.
