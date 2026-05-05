# 농작물을 지켜라! WebGL 배포 구조

`farm-defense-webgl.html`은 아래 경로를 기준으로 Unity WebGL 파일을 로드합니다.

- `/games/farm-defense/Build/Build.loader.js`
- `/games/farm-defense/Build/Build.data`
- `/games/farm-defense/Build/Build.framework.js`
- `/games/farm-defense/Build/Build.wasm`
- `/games/farm-defense/StreamingAssets/*`

Unity 빌드 결과물의 `Build` 폴더와 `StreamingAssets` 폴더를 이 위치로 그대로 업로드하면 됩니다.
