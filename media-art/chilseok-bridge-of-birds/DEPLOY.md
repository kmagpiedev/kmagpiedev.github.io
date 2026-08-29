# 배포

## GitHub Pages 하위 경로
이 폴더 전체를 저장소 루트의 `media-art/chilseok-bridge-of-birds/`에 둔다.

```bash
git add media-art/chilseok-bridge-of-birds
git commit -m "Add Chilseok media art: Bridge of Birds"
git push origin main
```

배포 주소:

- 일반 감상: `https://www.kmagpie.com/media-art/chilseok-bridge-of-birds/`
- 제출 녹화: `https://www.kmagpie.com/media-art/chilseok-bridge-of-birds/?capture=1&quality=high&render=1920x1080&lang=ko`
- 대표 장면: `https://www.kmagpie.com/media-art/chilseok-bridge-of-birds/?frame=44&quality=high&render=1920x1080&lang=ko`
- 재회 장면: `https://www.kmagpie.com/media-art/chilseok-bridge-of-birds/?frame=50&quality=high&render=1920x1080&lang=ko`
- 성능 검수: `https://www.kmagpie.com/media-art/chilseok-bridge-of-birds/?debug=1&autoplay=1`

## 로컬 검수
ES module을 사용하므로 파일을 직접 더블클릭하지 말고 HTTP 서버로 연다.

```bash
python -m http.server 8765
```

그다음 `http://localhost:8765/media-art/chilseok-bridge-of-birds/`로 접속한다.
