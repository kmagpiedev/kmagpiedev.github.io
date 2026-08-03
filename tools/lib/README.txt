이 폴더의 자바스크립트 라이브러리는 오픈소스이며 상업적 이용이 허용됩니다.

1) pdf-lib.min.js
   - 프로젝트: pdf-lib  (https://github.com/Hopding/pdf-lib)
   - 라이선스: MIT
   - 전문: pdf-lib.LICENSE.txt

2) pdf.min.mjs / pdf.worker.min.mjs
   - 프로젝트: PDF.js  (Mozilla, https://github.com/mozilla/pdf.js)
   - 라이선스: Apache License 2.0
   - 전문: pdfjs.LICENSE.txt

3) mediapipe/ 폴더
   - 프로젝트: MediaPipe Tasks Vision (Google)
   - 라이선스: Apache License 2.0
   - 전문: mediapipe/LICENSE.txt
   - 용도: 증명사진 도구의 AI 배경 제거 (브라우저 내 추론)
   - 모델: selfie_multiclass_256x256.tflite (16MB) 를 우선 사용합니다.
           배경/머리카락/피부/옷 등을 따로 구분해 정확도가 높습니다.
           불러오지 못하면 selfie_segmenter.tflite (250KB) 로 대체됩니다.

모든 라이선스가 저작권 고지를 함께 배포할 것을 요구하므로
LICENSE 파일들을 삭제하지 말고 그대로 두세요.

[용량 참고]
mediapipe/wasm/vision_wasm_module_internal.js 와 .wasm 은
실제 로딩에 사용되지 않는 변형입니다. 지우면 약 12MB를 아낄 수 있고
동작에는 영향이 없습니다 (SIMD판과 비SIMD판만 있으면 됩니다).
