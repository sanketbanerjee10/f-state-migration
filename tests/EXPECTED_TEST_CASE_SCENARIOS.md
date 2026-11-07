# Proposed Frontend Test Scenarios

These expected scenarios were identified by comparing the existing frontend tests with implemented user-facing flows. DRAFT-01 through DRAFT-12, GAME-UI-01 through GAME-UI-17, TRACK-01 through TRACK-08, and LEAD-01 through LEAD-08 now have executable tests under `tests/frontend/`. The cases remain documented here as a scenario index.

## 1. Application draft lifecycle

Relevant implementation: `src/hooks/useApplicationDraft.tsx`

| ID | Scenario | Expected result |
|---|---|---|
| DRAFT-01 | Start with no saved draft | The provider exposes the initial empty draft and no selected screenshot files. |
| DRAFT-02 | Restore a valid saved draft | Draft fields are restored from browser storage; `highestPowerOnRecord` is recalculated from the five power fields instead of trusting a stale saved total. |
| DRAFT-03 | Restore malformed saved JSON | The provider falls back to the initial draft without crashing the application. |
| DRAFT-04 | Update one power-breakdown field | The aggregate power is recalculated from all five power fields, and the aggregate is not marked as a user-edited field. |
| DRAFT-05 | Apply partial OCR results | Non-empty extracted values are applied, fields absent from the OCR result remain unchanged, and the aggregate power is recalculated. |
| DRAFT-06 | Set and remove an applicant screenshot | Setting a file updates the selected file, screenshot flag, and displayed filename; removal clears those values and the OCR-derived applicant fields. |
| DRAFT-07 | Set and remove a group screenshot | Setting a file updates its selected file, flag, and filename; removal clears all three. |
| DRAFT-08 | Add, edit, and remove group roster members | Adding appends a member, editing changes only the matching member, and removing deletes only that member. |
| DRAFT-09 | Load an existing application for editing | Applicant fields and non-applicant roster rows are mapped into the draft; the edit ID and generated reference are set; the aggregate power is calculated from applicant powers. |
| DRAFT-10 | Cancel editing | The draft and selected files are cleared, edit metadata is removed, and the `edit` query parameter is removed from the current URL. |
| DRAFT-11 | Complete edit-data loading with a deleted application | The provider exposes the deleted-application state so the UI can show its deleted-record handling. |
| DRAFT-12 | Clear a draft while preserving migration type | All other draft values and selected files reset, while the current migration type remains selected. |

## 2. Game UI flows

Relevant implementation: `src/components/game/` (especially `GameCanvas.tsx`, `GameMenuOverlay.tsx`, `GamePauseMenu.tsx`, `GameSettingsPanel.tsx`, `GameTouchControls.tsx`, and `GameScoreSubmission.tsx`)

| ID | Scenario | Expected result |
|---|---|---|
| GAME-UI-01 | Mount the game screen | The game engine is initialized and paused behind the main menu; resize and polling listeners are cleaned up when the component unmounts. |
| GAME-UI-02 | Start a survival run | The engine resumes, gameplay audio starts, the menu closes, and the active game state is shown. |
| GAME-UI-03 | Pause and resume a run | Pausing freezes the engine and gameplay audio and opens the pause menu; resuming reactivates them and restores canvas focus. |
| GAME-UI-04 | Restart a run from the pause menu | Run state resets for the current mode; gameplay can resume without carrying over the previous run's transient events. |
| GAME-UI-05 | Return to the main menu | The run resets to survival mode, the engine pauses, gameplay audio pauses, menu music starts, and tutorial/run UI state is cleared. |
| GAME-UI-06 | Start and navigate the tutorial | Tutorial entry resets to a fresh survival run; moving between valid steps updates the step and its relevant paused/running state. |
| GAME-UI-07 | Request tutorial exit and cancel | The confirmation is shown; cancel returns to the current step and resumes simulation/audio only when that step was running before the exit request. |
| GAME-UI-08 | Confirm tutorial exit | The tutorial closes and returns to the main menu without leaving the simulation running. |
| GAME-UI-09 | Change settings sections or go back | The selected section changes; leaving a section cancels any in-progress key capture; Back calls the supplied navigation callback. |
| GAME-UI-10 | Capture a supported key binding | The selected action receives the new key and capture mode ends. |
| GAME-UI-11 | Reject an unsupported key or cancel capture with Escape | Unsupported keys show an inline alert without changing the binding; Escape cancels capture without changing it. |
| GAME-UI-12 | Change touch-control visibility | `always` mounts controls, `never` hides them, and `auto` follows the responsive-device media query, including changes to that query. |
| GAME-UI-13 | Use the touch bomb control | Clicking with bombs available calls the bomb action; with zero bombs the control is disabled. |
| GAME-UI-14 | Submit a score with a blank or whitespace-only name | Submission is not sent and an accessible name-validation alert is shown. |
| GAME-UI-15 | Submit a valid eligible run | The trimmed player name and run statistics are sent once; pending and success states disable duplicate submission. |
| GAME-UI-16 | Submit a score for an ineligible game mode | The score-submission form is not rendered. |
| GAME-UI-17 | Handle a failed score submission | The failure is visible and the user can retry; a subsequent success displays confirmation and disables resubmission. |

## 3. Application tracking and leadership dashboard

Relevant implementation: `src/pages/ApplicationTracker.tsx`, `src/components/application-tracker/TrackModal.tsx`, `src/components/application-tracker/ApplicationSidePane.tsx`, `src/pages/LeadershipDashboard.tsx`, and `src/lib/auth.ts`

| ID | Scenario | Expected result |
|---|---|---|
| TRACK-01 | Open tracking with no saved applications | The empty state is shown and offers the track-application action. |
| TRACK-02 | Load saved tracking entries | Saved entries appear without automatically selecting one when the URL has no application ID. |
| TRACK-03 | Track an existing application by ID | The application is fetched, saved locally, selected in the list, reflected in the URL, and shown in the detail pane. |
| TRACK-04 | Submit an empty track ID | The modal shows an alert and does not issue a lookup. |
| TRACK-05 | Track an unknown or deleted application | The modal remains usable, shows the corresponding error state, and does not add an invalid item to local tracking. |
| TRACK-06 | Select and close a tracked application | Selection updates the route and detail pane; closing clears the selection and returns to `/track`. |
| TRACK-07 | Remove the currently selected tracked application | The local entry is removed, the detail pane closes, and the route returns to `/track`. |
| TRACK-08 | Open tracking from a `/track/:id` URL | The ID is selected and its detail pane opens; loading, deleted, and fetch-error states are presented appropriately. |
| LEAD-01 | Open the leadership dashboard while session status is loading | A session-checking placeholder is shown before protected dashboard content. |
| LEAD-02 | Open the dashboard without an authenticated session | The user is redirected to `/leadership`; protected dashboard content is not shown. |
| LEAD-03 | Open the dashboard with a valid session | Overview and application sections are enabled for the authenticated session. |
| LEAD-04 | Refresh dashboard data | Overview, application list, alliance list, tier thresholds, and any currently selected application detail are invalidated for refetch. |
| LEAD-05 | Select and close an application detail | Selecting an application opens its detail drawer; closing clears the selected ID and closes the drawer. |
| LEAD-06 | Receive a session-expired response | The session is logged out and navigation moves to `/leadership?expired=1`. |
| LEAD-07 | Log out normally | The auth session is cleared and navigation returns to `/leadership`. |
| LEAD-08 | Exchange a leadership token from the URL fragment | The fragment is removed from browser history before the token exchange completes; successful exchange authenticates the session. |

## Suggested implementation order

1. Draft restoration, OCR application, and edit/cancel lifecycle (DRAFT-02, DRAFT-05, DRAFT-09, DRAFT-10).
2. Main game start/pause/resume/restart and tutorial exit flows (GAME-UI-02 through GAME-UI-08).
3. Tracker lookup and stored-entry lifecycle (TRACK-03 through TRACK-08).
4. Leadership authentication/session-expiry and refresh flows (LEAD-02 through LEAD-08).
5. Remaining settings, touch-control, and score-submission UI states.
