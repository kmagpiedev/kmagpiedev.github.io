# 농작물을 지켜라! WebGL 배포 구조

기본 권장 경로는 아래입니다.

- `/games/farm-defense/Build/Build.loader.js`
- `/games/farm-defense/Build/Build.data`
- `/games/farm-defense/Build/Build.framework.js`
- `/games/farm-defense/Build/Build.wasm`
- `/games/farm-defense/StreamingAssets/*`

## 충돌 방지 / 대체 경로
`farm-defense-webgl.html`은 아래 순서로 자동 탐색합니다.

1. `/games/farm-defense/Build/*` (권장)
2. 페이지와 같은 경로의 `Build/*` (`./Build/*`)

즉, 기존에 루트 기준 `Build`를 쓰던 방식과 새 구조를 모두 지원합니다.
