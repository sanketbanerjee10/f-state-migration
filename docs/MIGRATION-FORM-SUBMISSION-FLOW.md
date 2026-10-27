# State 565 Migration Form: End-to-End Submission Flow

## Purpose and source of truth

This document describes the migration application flow implemented by the portal: browser wizard, client-side validation, OCR and manual entry, submission payload, API validation, persistence, and user-visible outcomes. It is intended to be consumed as structured product and engineering context by an AI.

The browser, API contract, runtime API validation, and database do not enforce exactly the same constraints. Each rule below is identified by its enforcement layer. When they differ, the discrepancy is called out rather than presented as one universal rule.

Key implementation files:

- Wizard and navigation: `artifacts/state-565-migration/src/pages/application/ApplicationWizard.tsx`, `artifacts/state-565-migration/src/hooks/useWizardNavigation.ts`
- Draft and browser validation: `artifacts/state-565-migration/src/hooks/useApplicationDraft.tsx`
- Main applicant details: `artifacts/state-565-migration/src/pages/application/PowerDetailsStep.tsx`, `artifacts/state-565-migration/src/pages/application/CombatPowerStep.tsx`
- Migration preferences and group roster: `artifacts/state-565-migration/src/pages/application/MigrationDetailsStep.tsx`, `artifacts/state-565-migration/src/pages/application/GroupRosterStep.tsx`
- Review and submit: `artifacts/state-565-migration/src/pages/application/ApplicationReviewStep.tsx`
- Submission API and validation: `artifacts/api-server/src/routes/migration.ts`, `artifacts/api-server/src/lib/validation.ts`
- OpenAPI contract and generated request schema: `lib/api-spec/openapi.yaml`, `lib/api-zod/src/generated/api.ts`
- Database schema and stores: `supabase/migrations/`, `artifacts/api-server/src/lib/postgresApplicationStore.ts`

## High-level flow

1. The visitor opens the wizard. The initial application type is `Individual`.
2. The browser draft is restored from session storage when available. Edit mode can also load an existing application from `GET /api/applications/{id}` when the URL contains `?edit={id}`.
3. The visitor completes Character Details, Combat Power, and Migration Details. Each Continue action validates the current step before navigating.
4. If `migrationType` is `Group`, the wizard adds a Group Roster step. The group roster itself may be empty; its Continue action has no additional validation.
5. Review validates the first three steps again. If valid, it opens a confirmation dialog.
6. On confirmation, the browser creates a UUID idempotency key (for a new submission), converts formatted numeric strings into integers, derives the migration tier from the current scoring thresholds, and sends JSON to the API.
7. New applications use `POST /api/applications`. Editing uses `PUT /api/applications/{id}`.
8. The API validates the request, persists the application and player records, and returns an application reference. The browser records the reference locally, clears the draft, and shows the success/celebration UI.

## Wizard steps and fields

### Step 1 — Character Details

Applicant fields:

- `gameName` / in-game player name.
- `kills`.
- Five required power components: `structurePower`, `techPower`, `troopPower`, `heroPower`, and `modVehiclePower`.
- `highestPowerOnRecord` is calculated as the rounded sum of those five components. It is displayed as read-only in this step.
- Optional screenshot upload to prefill fields and mark the applicant verified.

The five power components are required and positive even when OCR is used. Kills are optional and may be left blank or set to zero. The OCR screenshot is optional; the visitor can enter all power values manually.

### Step 2 — Combat Power

- Current state number.
- Current alliance name or tag.
- F1, F2, and F3 arena formation powers.
- The UI tells the applicant to enter arena formation powers without season buildings.

All three arena powers are required for the applicant.

### Step 3 — Migration Details

- Migration type: `Individual` or `Group`.
- Group representative, required for `Group`.
- Destination preference: either `Any alliance` or one or more active State 565 alliances.
- Migration reason, required.
- Additional comments, optional.

Active alliance choices are loaded from the API. If loading fails, the visitor must retry before continuing. The multi-select prevents selecting `Any alliance` together with specific alliances.

The tier is calculated for display/submission from power components and live tier thresholds; the client payload's `migrationTier` is not a free-form reason or destination selection.

### Step 4 — Group Roster (Group applications only)

The applicant can add roster members by bulk screenshot OCR or manual entry, edit a member, or remove a member. No extra roster validation runs when moving to Review. The member list may be empty; if it is empty, the effective submitted migration type is changed to `Individual`.

The applicant remains the primary player/application contact. Roster entries are additional players and do not replace the applicant's own Character Details or Combat Power fields.

### Final step — Review & Submit

The review page summarizes the application and provides links back to edit each applicable step. Attempting to confirm runs validation for Character Details, Combat Power, and Migration Details. If errors exist, submission is blocked and navigation returns to the earliest step with errors.

Before the network request, a confirmation dialog states that screenshots/OCR are processed in the browser, asks the visitor to confirm accuracy, and warns that leadership may reject invalid or falsified information.

## Input parsing and common numeric rules

### Power and kill text accepted by the browser

The shared magnitude parser accepts a positive number with optional commas and an optional `K`, `M`, or `B` suffix (case-insensitive), for example `5,453,196`, `5.4M`, or `12k`. The parser removes commas before parsing; it does not verify standard thousands-grouping placement.

- Whitespace around the entire value is trimmed.
- Commas are removed before parsing.
- The numeric value must be finite, greater than zero, no greater than `1,000,000,000,000`, and round to at least 1.
- Decimal values are accepted; the submitted payload rounds them to integers.
- Empty, zero, negative, exponent, and otherwise malformed values are rejected by the browser parser.

The server receives integer values, not the original formatted strings or suffixes.

### State number accepted by the browser

`parseStateNumber` accepts only 1–4 decimal digits and a numeric value from 1 through 9,999. The API also enforces 1–9,999.

## Validation constraints by field

### Applicant-level constraints

| Field | Browser/UI constraint | API/runtime and database constraint |
|---|---|---|
| In-game name (`gameName`) | Required after trimming; input `maxLength` is 30 characters. | Required, nonblank after trim, 1–30 characters. The API normalizes Unicode using NFKC and trims before persistence. |
| Current state (`currentState`) | Required; digits only, up to 4 digits; accepted range 1–9,999. | Required integer, 1–9,999; database column is `smallint`. |
| Current alliance (`currentAlliance`) | Required; input `maxLength` is 24 characters. | Required, nonblank after trim, maximum 24 characters. |
| F1/F2/F3 arena power | Each required and positive; shared magnitude parser; display says no season buildings. | Each required integer, 1–1,000,000,000,000. |
| Kills | Optional; blank or zero is allowed, as is a valid nonnegative value. | Required request property, but nullable; non-null integer 0–1,000,000,000,000. Null is normalized to zero for storage. |
| Structure/Tech/Troop/Hero/Mod Vehicle power | All five required and positive; shared magnitude parser. | All five are required integers from 1–1,000,000,000,000. |
| Power on Record | Browser-calculated from the five breakdown fields; shown read-only. | Required integer from 1–1,000,000,000,000. |
| Migration type | Required; `Individual` or `Group`. Defaults to `Individual`. | Required enum: `Individual` or `Group`. |
| Group representative | Required by browser when Group; input `maxLength` is 40. | Nullable, max 40; nonblank for Group. Must be null for Individual. |
| Preferred destinations | Required; choose `Any alliance` or at least one active alliance. | At most 30 unique positive alliance IDs. `Any alliance=true` requires an empty ID list; `false` requires at least one ID. The database checks that specific IDs refer to active alliances. |
| Migration tier | Derived on client from score/thresholds. | Recomputed from the applicant's power values and server thresholds; the client-provided tier is not authoritative. |
| Migration reason | Required; trimmed length 10–1,000 characters; text area caps at 1,000. | Required, trimmed length 10–1,000 characters. |
| Additional comments | Optional; up to 1,000 characters. | Nullable, max 1,000 characters. A supplied non-null value must not be blank after trimming. |
| Character reference | Not collected in the current wizard; submitted as `null`. | Required request property, nullable; if a string is supplied it must be nonblank and at most 40 characters. |
| Idempotency key | Generated by the browser as a UUID for a new submission attempt. | Required UUID and unique in the database. A repeated key returns the existing application instead of creating another. |

### Group-member constraints

For manual member entry, the browser requires a nonblank player name, current alliance, valid state, and all five power components. Power on Record is prefilled from the sum of those components. Kills may be zero or blank. Optional F1/F2/F3 powers may be left blank; if entered, they must parse as positive numbers.

For screenshot-imported members, all five power components must be detected and valid. Missing kills default to `0`; missing names use a generated member label; state/alliance use the applicant's current state/alliance. Power on Record is calculated from the five power components.

| Field | Browser/UI constraint | API/runtime contract |
|---|---|---|
| Player name | Required; manual input `maxLength` is 30. | Required, 1–30 characters. |
| Current alliance | Required; manual/edit input `maxLength` is 50. | Required nonblank string, maximum 50 characters. |
| Current state | Required in API; defaults to applicant state in the browser; 1–9,999. | Required integer, 1–9,999. |
| F1/F2/F3 arena powers | Optional in manual/edit UI; blank means unknown. | Optional integers from 1–1,000,000,000,000. These fields are part of the API contract and are persisted. |
| Power on Record | Prefilled as the sum of the five component powers. | Required integer from 1–1,000,000,000,000. |
| Structure/Tech/Troop/Hero/Mod Vehicle power | All five required and > 0. | Required integers from 1–1,000,000,000,000. |
| Kills | Optional; zero or blank is allowed. | Required request property, nullable; non-null integer >= 0. Null is normalized to zero for storage. |
| Screenshot verification | OCR-created member is marked verified; manually added member is not. | Required boolean. |
| Number of roster members | Maximum 99 additional roster members; together with the applicant, the application contains at most 100 players. Bulk uploads are limited to the remaining slots. | `groupMembers` has a maximum of 99 entries. |

Group-member score is calculated in the browser and must be between 10 and 1,000 for the roster member to be added from OCR or manual entry. The API recomputes and enforces the same range.

## Screenshot and OCR behavior

### Applicant screenshot

- Accepts PNG or JPEG/JPG by MIME type or filename extension.
- Maximum file size: 10 MiB.
- Only one applicant screenshot is processed at a time.
- OCR runs in the browser; image bytes are not submitted to the migration API.
- All five power breakdown fields must be present for the applicant to pass form validation. Player name may be recovered from OCR or manually entered. Kills is optional and may be zero/blank.
- A successful OCR result marks the applicant as screenshot verified. OCR uncertainty may still be shown to the visitor; the fields remain subject to normal form validation.
- `highestPowerOnRecord` is calculated from the five required power components. The OCR documentation says the five-row sum is used to validate the screenshot's displayed power.
- The actual screenshot file is not sent in the submission payload. Only `isScreenshotVerified` and derived text/numeric values are sent.

### Group roster screenshots

- Accepts multiple PNG or JPEG/JPG files, up to 10 MiB each.
- The browser processes at most two files concurrently and will process no more than the remaining slots under the 99-member roster limit.
- Each image must contain all five valid power components. A missing player name gets a generated member name; a missing/invalid power component makes the image unrecognized and the visitor can enter the member manually or upload a clearer screenshot.
- Group OCR computes Power on Record as the sum of the five component powers and defaults missing kills to `0`.
- A member with a calculated score outside 10–1,000 is not added by the browser or accepted by the API.
- Each imported member is marked screenshot verified; the image itself is not sent to the server.

### OCR privacy boundary

Screenshot recognition and text extraction happen in the browser. The form submission contains structured values and verification flags, not screenshot bytes or raw OCR output. OCR may load browser-side language/model/runtime files; this is separate from application submission.

## Migration score and tier

The score uses Structure, Tech, Hero, and Mod Vehicle power, converted to millions. Troop Power is collected and included in Power on Record but is not an input to this score formula.

```text
base = (structure + tech + hero + 3 * vehicle) / 6 - 2
techVehicleBonus = min(14, 2.8 * max(0, tech + vehicle - 21.5))
eliteTechBonus = 9.2 * max(0, tech - 30)
score = round(base + techVehicleBonus + eliteTechBonus, 2)
```

Tier thresholds and required passes are fetched from the API and cached in browser local storage for up to 3 days. The server independently loads the configured thresholds when accepting the submission and recalculates the tier using the same score formula. If no threshold rows are available, defaults are:

| Tier | Score range | Required passes |
|---|---:|---:|
| Regular | score < 20 | 10 |
| Medium | 20 to < 40 | 15 |
| Advanced | 40 to < 100 | 20 |
| Elite | >= 100 | 50 |

The persistence layer calculates and stores a migration score for each player record using the same server-side calculation used to derive the submitted application's tier. The server does not trust a client-supplied tier.

## Submission payload

The current browser payload contains:

```json
{
  "idempotencyKey": "UUID",
  "gameName": "trimmed applicant name",
  "currentState": 565,
  "currentAlliance": "trimmed applicant alliance",
  "f1ArenaPower": 180500000,
  "f2ArenaPower": 99183574,
  "f3ArenaPower": 22349680,
  "kills": 5453196,
  "preferredAllianceIds": [1],
  "anyAlliance": false,
  "migrationTier": "Regular",
  "migrationType": "Individual",
  "groupRepresentative": null,
  "migrationReason": "At least ten characters.",
  "characterReference": null,
  "additionalComments": null,
  "highestPowerOnRecord": 210000000,
  "structurePower": 70000000,
  "techPower": 15000000,
  "troopPower": 50000000,
  "heroPower": 45000000,
  "modVehiclePower": 30000000,
  "isScreenshotVerified": false,
  "groupMembers": []
}
```

The values above are illustrative only. For `Any alliance`, send `anyAlliance: true` and `preferredAllianceIds: []`. When applicant OCR was used, `additionalComments` may include `[Screenshot Verified]`; a group submission with members may add `[Group Members: N]`. Existing visitor comments are trimmed and joined with these tags.

For group entries, the browser maps each member's name and power/kills values to trimmed/integer values, uses the member alliance or applicant alliance, uses the member state or applicant state, and includes the member verification flag. Optional arena values are only included when nonblank and positive.

## API request, validation, and response

- Create: `POST /api/applications`.
- Edit: `PUT /api/applications/{applicationId}`.
- Both routes use the in-memory per-client-IP rate limiter: 5 requests per 10-minute window by default. A request over the limit returns HTTP 429 with `Retry-After`. This limit is process-local, not a distributed/global quota.
- The API validates the JSON body against the generated submission schema with a strict root object. Unknown top-level properties are rejected.
- Additional server checks enforce nonblank game name/alliance; `Any alliance` versus specific IDs exclusivity; destination uniqueness and presence; Group representative rules; and nonblank optional character reference/comments when supplied.
- The server normalizes game name with Unicode NFKC and trims the game name, current alliance, migration reason, group representative, character reference, and comments before persistence.
- Invalid payload: HTTP 400 with field-level details.
- Rate limit: HTTP 429.
- Store unavailable: HTTP 503.
- Data conflict: HTTP 409.
- Unexpected server failure: HTTP 500.
- New record response: HTTP 201; a repeated idempotency key may return HTTP 200. Response includes a message, `applicationReference` (`565-` plus an uppercase application ID fragment), and `applicationId`.
- Edit success returns the same reference shape and an updated message; missing application returns HTTP 404.

## Persistence and success behavior

- A new submission creates an application with initial status `Pending`.
- The applicant is stored as the primary player record.
- For a Group application, each provided roster member is stored as a separate non-applicant player record associated with the same application.
- Applicant and member power, kills, alliance, state, and screenshot-verification status are stored as structured player/application data. Screenshot files and raw OCR text are not persisted by this form submission.
- The database enforces core ranges and relationships, including applicant state, alliance, arena powers, kills, tier/type/status enum mappings, destination consistency, and group representative consistency.
- On client success, the reference is saved to tracked applications in local storage, the draft is cleared, and a success/celebration view is shown. On failure, the draft remains so the visitor can retry.
- The draft is synchronized to session storage. Screenshot `File` objects are held in browser memory and are not serialized into the application payload.

## Implementation discrepancies and AI handling notes

The previously observed browser/API mismatches have been resolved in the current implementation:

- Applicant and group player names are capped at 30 characters in the browser and API.
- Applicant and group state values are limited to 1–9,999 by both browser and API validation.
- Group-member current alliance supports up to 50 characters in the browser and API.
- Group-member current state and optional F1/F2/F3 arena values are defined in the OpenAPI contract and survive request validation for persistence.
- Kills may be zero or null/blank for applicants and group members. Null is normalized to zero in storage. All power components and calculated Power on Record remain required and positive.
- Browser and server both calculate scores. The API recomputes the score and authoritative tier from the submitted applicant power values; it also enforces the 10–1,000 group-member score range.
- An empty Group roster is still intentionally submitted as Individual.
- The API requires applicant power breakdown fields and caps group additions at 99, giving a 100-player maximum including the applicant.

For AI answers and downstream validation, still distinguish a **browser rule**, an **API rule**, and a **database rule**. In particular, the API normalizes null kills to zero before database persistence.
