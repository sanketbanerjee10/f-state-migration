# OCR Integration README (instructions for the coding agent)

**Goal:** replace the player-screenshot OCR with the newer, language-independent version and add **PaddleOCR** (free, open source, runs in the browser) as a second reader for the player **name** and the **kills** number.

All code is in the appendices at the bottom of this file. You copy it; you do not design it.

---

## 0. Rules (read before doing anything)

1. Do the steps **in order**. Do not skip, merge or reorder them.
2. **Copy code from the appendices exactly.** Do not rename things, reformat, "improve", simplify, add dependencies, or change logic. If it does not compile or a test fails, **stop and report the exact error text**. Do not rewrite the logic to make it pass.
3. After every step run the check listed under it. If the check fails, fix only what the step tells you to fix. If it still fails, stop and report.
4. **Never write "passed" or "works" unless you ran the check and saw it pass.** If you could not run something (for example you have no browser), write `NOT VERIFIED` for it in the final report.
5. Privacy: the screenshot must never be uploaded anywhere. Do not add any network call other than the library and model downloads described in this file. Do not log OCR text or extracted values (a temporary log is allowed only where Step 10 says so, and it must be removed).
6. Do not change: `ocrTypes.ts`, `normalizeOcrNumbers.ts` behaviour, the application submission payload, or anything unrelated to OCR.
7. If a file in the repo differs from what this README expects, keep the repo's structure and apply only the described behaviour change. Report the difference.

---

## 1. What this change does

### 1.1 Flow

```text
screenshot
  |
  +-- Tesseract (English) reads the 5 power rows by POSITION (labels in any language are ignored)
  |        rows must be 5 right-aligned numbers at an even vertical pitch
  |        a 6th row below them (if present) = Highest Power on Record
  |
  +-- the banner (name + power beside name + kills) is located relative to those rows
  |
  +-- stats line (power beside name + kills):
  |        Tesseract reads it 4 times (white-text mask, different scale/threshold)
  |        PaddleOCR reads it once more
  |        reads are compared; power must equal the SUM of the 5 rows; kills must be read the same way by most reads
  |
  +-- name line:
  |        Tesseract: split into words by pixel gaps, each word read with the best language pack
  |        PaddleOCR: multilingual v6 model; Korean and Cyrillic models only if the name is still doubtful
  |        nameChoice.ts decides (table below)
  |
  +-- result in the same shape as before (ExtractedPlayerFields), confidence folded in:
           sum matches AND kills consistent  -> confidence >= 90  -> form shows "verified"
           anything else                     -> confidence <= 54  -> form shows "please verify"
```

PaddleOCR is **optional at runtime**: if it cannot load (offline, blocked host, old browser) every PaddleOCR call returns nothing and the app behaves exactly like Tesseract-only.

### 1.2 How the name is chosen (`nameChoice.ts`, confidence 0-100)

| Order | Condition | Result |
|---|---|---|
| 1 | Tesseract and PaddleOCR have the same letters (accents ignored) | Tesseract text (the spelling with more accents if they differ) |
| 2 | Tesseract confidence >= 90 | Tesseract |
| 3 | A PaddleOCR candidate has confidence >= 85 | the most confident PaddleOCR candidate |
| 4 | Tesseract confidence >= 60 | Tesseract |
| 5 | A PaddleOCR candidate has confidence >= 80 | PaddleOCR |
| 6 | otherwise | empty name (applicant types it, form is marked uncertain) |

### 1.3 What has and has not been verified (be honest in your report about the same split)

| Item | Status |
|---|---|
| Tesseract pipeline on 4 real screenshots (Korean UI, English UI, Vietnamese UI, Korean UI with extra section): all names, kills, power, five rows, highest power correct | verified in Node, Tesseract "fast" language files |
| Same 4 screenshots with a Node PaddleOCR (Chinese/English model) plugged in as the second reader | verified, all correct |
| 15 synthetic names (Japanese, Chinese simplified/traditional, Turkish, Vietnamese, Russian, Korean, English): 13 correct | verified. Known misses: one Japanese name gets an extra character; an underscore between two Latin words can turn into a space |
| 46 unit tests in the four `*.test.ts` files | verified, all pass |
| Type-check against the real `ppu-paddle-ocr` 6.6.1 and `tesseract.js` 7.0.0 types | verified |
| `ppu-paddle-ocr/web` running in a real browser with `onnxruntime-web` | **NOT verified** (this is what Step 10 is for) |
| PaddleOCR v6-tiny, Korean v5 and Cyrillic v5 models | **NOT verified** (models could not be downloaded where the code was tested) |
| Download sizes and speed on phones | **NOT verified**, record them in Step 10 |

---

## 2. File map

All files live in `artifacts/state-565-migration/src/lib/ocr/` (use the repo's real path if different).

| File | Action | Appendix |
|---|---|---|
| `rasterOps.ts` | new | A1 |
| `extractByLayout.ts` | **replace** (old API is gone) | A2 |
| `headerNumbers.ts` | new | A3 |
| `extractPlayerFields.ts` | **replace** | A4 |
| `nameChoice.ts` | new | A5 |
| `paddleBanner.ts` | new | A6 |
| `recognizeScreenshot.ts` | **replace** | A7 |
| `headerNumbers.test.ts` | new | A8 |
| `extractByLayout.test.ts` | **replace** | A9 |
| `nameChoice.test.ts` | new | A10 |
| `cleanPlayerName.test.ts` | new | A11 |
| `PowerDetailsStep.tsx` (and `useApplicationDraft.tsx` only if needed) | edit as described in Step 8 | none |
| the "Screenshot OCR" markdown doc and `DEPLOY-CLOUDFLARE-PAGES.md` | edit as described in Step 11 | none |

---

## 3. Steps

### Step 1. Look around (read only, change nothing)

Run these from the repo root and keep the output for your report:

```bash
git status
git rev-parse --abbrev-ref HEAD
ls pnpm-lock.yaml yarn.lock package-lock.json bun.lockb 2>/dev/null
cat artifacts/state-565-migration/package.json
ls artifacts/state-565-migration/src/lib/ocr
cat artifacts/state-565-migration/src/lib/ocr/normalizeOcrNumbers.ts
cat artifacts/state-565-migration/src/lib/ocr/ocrTypes.ts
grep -rn "moduleResolution" artifacts/state-565-migration/tsconfig*.json tsconfig*.json 2>/dev/null
grep -n "recognizeScreenshot\|console\.log\|highestPowerOnRecord\|extracted\|confidence" artifacts/state-565-migration/src/pages/application/PowerDetailsStep.tsx
```

Write down:
- the package manager (the lock file that exists: pnpm / yarn / npm / bun),
- the test runner (vitest or jest, from `package.json`),
- the `tesseract.js` version,
- the `moduleResolution` value.

**Check:** you can answer all four. If `normalizeOcrNumbers.ts` does not export `normalizeOcrNumber(raw: string): string | null` and `formatWithCommas(digits: string): string`, stop and report (the new code relies on exactly these two).

### Step 2. Make a safety branch

```bash
git checkout -b ocr-paddle-integration
```

If the working tree already has uncommitted changes, commit them first with message `wip before ocr integration`.

**Check:** `git rev-parse --abbrev-ref HEAD` prints `ocr-paddle-integration`.

### Step 3. Install the two dependencies

Run exactly one of these (use the package manager you found in Step 1):

```bash
# pnpm workspace: use the "name" field from artifacts/state-565-migration/package.json
pnpm --filter <that-name> add ppu-paddle-ocr onnxruntime-web

# npm
cd artifacts/state-565-migration && npm install ppu-paddle-ocr onnxruntime-web

# yarn
cd artifacts/state-565-migration && yarn add ppu-paddle-ocr onnxruntime-web
```

Do **not** install `onnxruntime-node` or `onnxruntime-react-native`. Do not run `audit fix`.

**Check:**

```bash
ls artifacts/state-565-migration/node_modules/ppu-paddle-ocr/web/index.js
```

(with pnpm the path may be under `node_modules/.pnpm`; `ls` of `node_modules/ppu-paddle-ocr` inside the app folder must work). Both packages must now appear in the app's `package.json` under `dependencies`.

Tested versions: `ppu-paddle-ocr` 6.6.1, `tesseract.js` 7.0.0. Its peer dependency is `onnxruntime-web ^1.23.2`.

### Step 4. Copy the code files

Create or overwrite these seven files with the **exact** contents of the appendices: `rasterOps.ts` (A1), `extractByLayout.ts` (A2), `headerNumbers.ts` (A3), `extractPlayerFields.ts` (A4), `nameChoice.ts` (A5), `paddleBanner.ts` (A6), `recognizeScreenshot.ts` (A7).

Rules while copying:
- Copy the whole file, from the first `import` line to the last line.
- Do not add or remove blank lines, comments or imports.
- If your repo's file formatter or lint runs on save, that is fine, but do not change code by hand.

**Check:** `git status` shows exactly those seven files as new or modified in the ocr folder, plus `package.json` and the lock file.

### Step 5. Tesseract.js version

Look at the `tesseract.js` version from Step 1.
- **6.x or 7.x**: do nothing.
- **5.x**: in `recognizeScreenshot.ts` there are exactly two lines containing `eng.recognize(file, {}, { text: true, blocks: true })`. Change both to `eng.recognize(file)`. Change nothing else.
- anything else: stop and report.

**Check:** `grep -n "eng.recognize(file" recognizeScreenshot.ts` shows two lines.

### Step 6. Tests

1. Copy A8, A9, A10, A11 into the same folder as the code (they import with `./`).
2. Test runner:
   - **vitest**: use as is.
   - **jest**: delete the first line (`import { describe, expect, it } from 'vitest';`) in each test file, or replace it with `import { describe, expect, it } from '@jest/globals';`.
3. Delete or fix any **other** existing test that imports something that no longer exists. The old `extractByLayout` function, `nameCropRect` and the old `LayoutResult` fields are gone. Search:
   ```bash
   grep -rn "nameCropRect\|extractByLayout(" artifacts/state-565-migration/src
   ```
   Any hit in a test file: delete that test (the new tests replace it). Any hit in non-test code: stop and report.
4. In the existing `extractPlayerFields.test.ts`: tests that expect hard-coded name corrections (for example turning garbage into `GOD Sankeyyy`) are obsolete because those corrections were removed. Change those tests to expect the plain cleaned text, or delete them. Leave all other tests alone.

**Check:** run the repo's test command for the ocr folder. Expected: the four new files pass with **46 tests** in total (11 + 16 + 14 + 5). Everything else that passed before still passes.

### Step 7. Type-check and lint

Run the repo's type-check, then lint, then the full test suite.

**Check:** all three succeed. Typical failures and the only allowed fixes:

| Error | Fix |
|---|---|
| `Cannot find module 'ppu-paddle-ocr/web'` | `moduleResolution` is too old. In the app's `tsconfig`, set `"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`). Change nothing else. |
| error about `ImageBitmap`, `document` or `navigator` | the tsconfig `lib` must contain `"DOM"`. Add it. |
| `Property 'recognize' ... expected 1 arguments` | you are on tesseract.js 5: do Step 5. |
| anything else | stop and report the exact message |

### Step 8. Wire it into the form

Open `PowerDetailsStep.tsx` (and `useApplicationDraft.tsx` if it holds the field logic). The call `recognizeScreenshot(file, onProgress, signal)` is unchanged, so most of the file stays as it is. Make **only** these behaviour changes:

1. **No logging.** Remove any `console.log` that prints the extracted result or raw OCR text.
2. **Highest Power on Record.** Some cards (the ones with a second section containing Wins and Losses) contain a real "Highest Power on Record" row, and the OCR now returns it as `extracted.highestPowerOnRecord`. Rule:
   - if `extracted.highestPowerOnRecord` has a value, store **that** value in the draft's `highestPowerOnRecord`;
   - if it is empty, keep **exactly** what the form did before for this field (do not invent a new rule).

   Example shape (adapt names to the file):
   ```ts
   const highest = extracted.highestPowerOnRecord ?? <whatever the code computed before>;
   ```
   If this field is currently a **read-only calculated total** (sum of the five rows), that total equals current power, which is a different number from the real highest power. Do not decide this yourself: apply the rule above, then put one sentence in your report saying how the field behaved before, and ask the user whether they want the calculated fallback kept.
3. **Locking.** Keep the existing rule: the five power-breakdown fields are locked when OCR filled them. The **name stays editable** and **kills stays editable**. Do not lock either.
4. **Validation rule stays as it is** (the six core fields: name plus the five breakdown values; reject the image below 5 detected; uncertain when confidence < 55 or a core field is missing). Do not change thresholds.
5. **Progress.** The `onProgress` messages now include extra statuses ("Reading player banner", "Reading player name"). Make sure the UI prints `status` as given and does not assume a fixed list. Change nothing if it already does.

**Check:**

```bash
grep -rn "console\.log" artifacts/state-565-migration/src/pages/application artifacts/state-565-migration/src/lib/ocr
```

prints nothing.

### Step 9. Build and bundle check

```bash
# run the repo's production build
```

**Check:**
1. The build succeeds.
2. PaddleOCR must be a **separate lazy chunk**. Search the build output for a file containing `ort-wasm` or `PaddleOcrService`; it must not be the main entry bundle. If it is inside the main bundle, stop and report (the code uses dynamic `import()` on purpose).
3. List the sizes of the new chunks in your report.

### Step 10. Test in a real browser (this step is mandatory)

You need the four screenshots. If you do not have them, **stop and ask the user for them**. Do not mark this step done without them.

Start the dev server (or a preview of the production build) and open the application form's Power Details step. For each screenshot below, upload it and compare. To read the numbers that the form does not show (power beside name), temporarily add `console.log(result.extracted)` right after `recognizeScreenshot` returns, **only on your machine**, and remove it before finishing.

| # | Screenshot | name | power beside name | kills | five rows (structure / tech / troop / hero / mod vehicle) | highest power on record |
|---|---|---|---|---|---|---|
| 1 | Korean UI, avatar with glasses | `빈체로 Ally` | 234,142,924 | 2,821,828 | 76,172,616 / 16,671,414 / 82,208,280 / 50,173,270 / 8,917,344 | not on card |
| 2 | English UI, "Long pro310" | `Long pro310` | 249,058,746 | 4,089,882 | 69,496,322 / 21,942,435 / 80,476,620 / 65,414,822 / 11,728,547 | not on card |
| 3 | Vietnamese UI ("Chi Tiet") | `박차르` | 294,163,646 | 4,293,166 | 116,196,326 / 18,951,092 / 83,740,300 / 64,597,087 / 10,678,841 | 319,377,435 |
| 4 | Korean UI ("상세") | `박차르` | 294,163,646 | 4,293,166 | same as #3 | 319,377,435 |

Expected for all four: values exactly as in the table, the form shows the **verified** state (not "please verify"), `confidence` is 90 or higher.

Then run these extra checks and write down the result of each:
- **A. Network requests.** Open DevTools, Network tab, clear it, upload screenshot #2. Expect: Tesseract `eng` trained data; PaddleOCR model files (`.ort` or `.onnx`, plus a dictionary `.txt`) from Hugging Face; `onnxruntime-web` `.wasm` and `.mjs` files from `cdn.jsdelivr.net`. Record the **size of each model file** and the **time** from upload to result.
- **B. Korean model is lazy.** On screenshot #2 (a Latin name) no Korean or Cyrillic PaddleOCR model should be requested. On screenshot #1 or #3 the Korean model may be requested. Record which happened.
- **C. Fallback.** DevTools, Network, "Block request URL": block `*huggingface.co*` and `*jsdelivr*`, hard-reload, upload screenshots #1 to #4 again. Expected: **same correct results** (Tesseract only). If PaddleOCR blocked changes any result, report it.
- **D. Wrong image.** Upload any random photo. Expected: the invalid-image message appears and nothing is filled.
- **E. Cancel.** Upload #1 and press cancel during OCR. Expected: OCR stops, manual entry works, no error in the console.
- **F. No leaks.** After removing your temporary log, confirm the Console prints no OCR text and no requests carry the image (only downloads).

If any of #1 to #4 fails: do not change code. Report the screenshot number, the field, expected vs actual, and the browser/version.

### Step 11. Update the documentation

In the "Screenshot OCR" markdown doc, update these parts (keep the doc's style):
- **Processing flow:** describe the new flow from section 1.1 of this README in 5-6 numbered steps.
- **Fields table:** name = banner read by Tesseract and PaddleOCR, decided as in section 1.2; power rows = by position, not by label; Highest Power on Record = the row after the five (only on cards that have the second section), kept only if it is at least current power; kills = stats line read several times, accepted only when most reads agree.
- **Validation:** the sum check (five rows must add up to the power beside the name) and the kills-agreement check both feed `confidence` (>= 90 trusted, <= 54 shows "please verify").
- **Privacy and resource loading:** replace the paragraph with:
  > Recognition runs in the browser. The screenshot is never uploaded. To run, the browser downloads Tesseract language data (English always; Korean, Japanese, Chinese, Russian, Vietnamese and Turkish only when a name needs them), the PaddleOCR library and ONNX Runtime WebAssembly files (from jsDelivr), and PaddleOCR model files (from Hugging Face). These are downloads only; no image data is sent. If PaddleOCR cannot load, OCR continues with Tesseract alone. To turn PaddleOCR off, set `paddleConfig.enabled = false` in `paddleBanner.ts`. To self-host the ONNX Runtime files, set `paddleConfig.wasmPaths` (for example `'/ort/'`) and copy the files from `node_modules/onnxruntime-web/dist` into the public folder.
- **Implementation references:** add `rasterOps.ts`, `headerNumbers.ts`, `nameChoice.ts`, `paddleBanner.ts` and the new test files.

In `DEPLOY-CLOUDFLARE-PAGES.md` add a short note: if a Content-Security-Policy is configured, it must allow the hosts listed in Troubleshooting; and do **not** enable cross-origin isolation headers (COOP/COEP) for this feature, they are not needed and would block the model downloads.

**Check:** `grep -rn "No OCR API" docs` (or wherever the doc lives) still reads correctly: there is still no OCR API call.

### Step 12. Final report

Reply with exactly this structure:

```text
FILES CHANGED: <list>
DEPENDENCIES ADDED: <names + installed versions>
STEP RESULTS: step 1..11, each "done" / "done with note" / "NOT VERIFIED" / "FAILED"
TESTS: <number passed / total>, type-check <ok/failed>, lint <ok/failed>, build <ok/failed>
BUNDLE: <names and sizes of new chunks>
BROWSER (Step 10): table of screenshots #1-#4 with PASS/FAIL per field, and answers to checks A-F
MODEL FILE SIZES AND TIMINGS: <from check A>
DIFFERENCES FROM THIS README: <anything in the repo that was different, and what you did>
QUESTION FOR USER: <the Highest Power on Record question from Step 8, if it applies>
```

---

## 4. Troubleshooting (apply only when the symptom appears)

| Symptom | Cause | Fix |
|---|---|---|
| Dev server error: failed to resolve `ppu-paddle-ocr/web` | old `moduleResolution`, or not installed | Step 7 table; re-check Step 3 |
| Browser console: `no available backend` or 404 on `ort-wasm...wasm` | the `.wasm` files could not load | Set `paddleConfig.wasmPaths = '/ort/'` in `paddleBanner.ts` and copy the contents of `node_modules/onnxruntime-web/dist` to the public folder `ort/` |
| Vite dev only: errors about `onnxruntime-web` or `import.meta.url` | dependency pre-bundling | In the Vite config add `optimizeDeps: { exclude: ['onnxruntime-web', 'ppu-paddle-ocr'] }`, restart the dev server |
| Requests blocked by Content-Security-Policy | CSP header or meta tag exists | Allow: `script-src` and `connect-src` for `https://cdn.jsdelivr.net`; `connect-src` for `https://huggingface.co` **and the redirect host shown in the failing request** (Hugging Face redirects model files to its own CDN); `script-src 'wasm-unsafe-eval'` |
| PaddleOCR never seems to run, no error | by design every PaddleOCR failure is swallowed | Temporarily add `console.error(e)` inside the `catch` of `load()` and `service()` in `paddleBanner.ts`, find the cause, then **remove** the logging |
| Everything works but is slow on a phone | WebAssembly, single thread | expected; do not enable COOP/COEP; report the timing |
| Name is blank for a valid screenshot | both readers were below the confidence limits | expected behaviour (applicant types it, form shows "please verify"); report the screenshot |
| Kills wrong but the form shows "verified" | the reads agreed on a wrong value | report screenshot and values; do not change thresholds |
| Test in `extractPlayerFields.test.ts` fails on a name | obsolete hard-coded correction | Step 6 point 4 |

Optional, **do not do unless the user asks**: self-hosting PaddleOCR model files. Note Cloudflare Pages rejects single files larger than 25 MiB.

---

## 5. Known limits (state these to the user, do not try to fix them)

- Japanese names: on a synthetic test font one name got an extra character. Real game fonts are untested.
- An underscore between two Latin words can be read as a space.
- Names with accents (Turkish, Vietnamese) are restored by extra Tesseract language packs; this downloads about 5 MB once (cached by the browser).
- Language is never detected automatically; the code tries Latin first, then other scripts only when the first read is doubtful.
- A single doubtful word makes Tesseract reject the whole name; the final decision then relies on PaddleOCR or leaves the name blank.
- The banner position is derived from the table with proportions measured on the real card. A different card layout would need re-measuring.

---

## 6. Do-not list

- Do not upload the image or call any OCR API.
- Do not add a language dropdown.
- Do not change confidence thresholds or constants in `nameChoice.ts`, `recognizeScreenshot.ts` or `headerNumbers.ts`.
- Do not "simplify" the code by merging files.
- Do not leave temporary logging in the code.
- Do not mark anything verified that you did not run.

---

## 7. Definition of done

- [ ] Seven code files and four test files copied exactly
- [ ] 46 new tests pass, nothing else regressed
- [ ] type-check, lint, build pass
- [ ] PaddleOCR is in a separate lazy chunk
- [ ] Browser check passed for all four screenshots, including the blocked-PaddleOCR fallback
- [ ] No `console.log` of OCR data anywhere
- [ ] Docs updated
- [ ] Final report sent in the exact format of Step 12