# Screenshot OCR

## Processing flow

1. Tesseract reads the screenshot and locates the five power rows by position, independent of UI language.
2. The banner is located from those rows; the five row values remain the source for the power breakdown fields.
3. Tesseract and PaddleOCR v6 read the banner stats. The five-row sum validates the power value, and repeated header reads provide majority evidence for kills.
4. Tesseract reads the name crop with the available language sets. PaddleOCR v6 reads the same crop, with Korean or Cyrillic models loaded only when the name remains uncertain.
5. `nameChoice` selects the name using engine agreement and confidence thresholds.
6. The merged result is returned as `ExtractedPlayerFields`; the existing form applies the values and marks the result verified or uncertain.

## Fields and validation

- Player name: read from the banner by Tesseract and PaddleOCR, then selected by `nameChoice`.
- Power breakdown: five right-aligned rows read by position, not by label.
- Kills: read repeatedly from the stats line and accepted when most reads agree.
- Power validation: the five breakdown rows must add up to the power beside the name.
- Confidence: a matching power sum and consistent kills produce trusted confidence; otherwise the form requests verification.
- Highest Power on Record: the form continues to use the calculated total of the five required power fields. The optional card row is not required.

## Privacy and resource loading

Recognition runs in the browser. The screenshot is never uploaded. The browser downloads Tesseract language data, PaddleOCR, ONNX Runtime WebAssembly files, and PaddleOCR model files as needed. These are downloads only; no image data is sent. If PaddleOCR cannot load, recognition continues with Tesseract alone.

## Diagnostics

In development builds, the stage-1 OCR section contains an expandable diagnostics panel showing raw Tesseract text, confidence, header and name reads, Paddle availability, Paddle stats text, and Paddle name candidates.

## Implementation

The OCR implementation is in `src/lib/ocr/`, including `rasterOps.ts`, `extractByLayout.ts`, `headerNumbers.ts`, `nameChoice.ts`, `paddleBanner.ts`, `recognizeScreenshot.ts`, and the focused OCR tests.
