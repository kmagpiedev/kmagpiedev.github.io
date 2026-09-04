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

4) upscaler/ 폴더  — 사진 화질 개선(AI 업스케일) 도구
   - tf.min.js            : TensorFlow.js 4.22 (Google) — Apache License 2.0, 전문: upscaler/tfjs.LICENSE.txt
   - upscaler.min.js      : UpscalerJS 1.0 (Kevin Scott) — MIT, 전문: upscaler/upscalerjs.LICENSE.txt
   - esrgan-medium-x2/x4  : @upscalerjs/esrgan-medium 모델 정의 + 가중치(models/x2, models/x4) — MIT,
                            전문: upscaler/esrgan-medium.LICENSE.txt
   - 모든 추론은 브라우저 안에서 실행되며 모델 파일은 이 폴더에서만 불러옵니다(CDN 사용 안 함).

5) ocr/ 폴더  — 사진 글자 추출(OCR) 도구
   - tesseract.min.js / worker.min.js
       : Tesseract.js 7.0.0 — Apache License 2.0, 전문: ocr/tesseractjs.LICENSE.txt
   - tesseract-core-simd-lstm.js + .wasm      (SIMD 지원 기기용, 기본)
     tesseract-core-lstm.js       + .wasm      (비SIMD 폴백)
       : tesseract.js-core 7.0.0 (Tesseract OCR 엔진의 WebAssembly 빌드, LSTM 전용)
         — Apache License 2.0, 전문: ocr/tesseractjs-core.LICENSE.txt
       : 페이지가 WebAssembly SIMD 지원 여부를 직접 확인해 둘 중 하나를 고릅니다.
   - (단일파일 판 tesseract-core-*-lstm.wasm.js 는 용량 때문에 넣지 않았습니다.
      글루 .js + 별도 .wasm 조합만 배포하며, 페이지의 2순위 폴백 시도는 404 로 끝나고
      그 경우 안내 문구만 표시됩니다.)
   - lang/kor.traineddata.gz (약 1.06MB), lang/eng.traineddata.gz (약 1.88MB)
       : Tesseract 공식 언어 데이터 tessdata_fast — Apache License 2.0,
         전문: ocr/tessdata.LICENSE.txt
       : tesseract.js 는 langPath 아래에서 <언어코드>.traineddata.gz 를 찾습니다
         (gzip:true 옵션). 파일 이름을 바꾸지 마세요.
   - 인식은 전부 브라우저 안에서 실행되며, createWorker 의 workerPath·corePath·langPath 를
     모두 /tools/lib/ocr/ 절대경로로 지정하고 workerBlobURL:false 로 두어
     CDN 등 외부 요청이 전혀 없습니다.
