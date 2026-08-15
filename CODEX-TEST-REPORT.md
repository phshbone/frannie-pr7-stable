# Frannie Codex test report

## PROVEN

- JavaScript syntax passes for `app.js`, `shared-care-core.js`, `shared-care.js`, `frannies-training-update.js`, `sw.js`, and `worker/src/worker.js`.
- 52 executable state/structure assertions pass: the preserved PR7 sitter/state behavior, same-name replacement-device sitter ending and synchronization, isolated cache cleanup, viewport-owned absolute scrolling, body-anchored absolute navigation, the original three-second splash, multiple current medications/foods, append-only audit union, secure invite and recovery URLs, official imagery/icons/manifest, restored training library, iPhone modal cleanup, and complete PWA asset alignment.
- 24 simulated Worker assertions pass: live health compatibility, valid invite, reusable and replaceable recovery links, same-name device retirement, sitter ownership handoff, complete shared-state persistence, stale-version conflict, revocation, and administrative recovery.
- No permanent family or device credential is included in source, HTML, or the invite URL implementation.

Command: `npm test`

## SIMULATED

- Device A activation merged against stale Device B state remains active.
- Multiple current medications and feeding records survive normalization/merge independently.
- Local and remote audit entries remain exactly once after conflict merge.
- Pairing, invite consumption, conflict, revocation, and recovery run against an in-memory D1-compatible test double.

## STATICALLY CHECKED

- `setNextActivity -> onLocalPersist -> addActivity -> Store.save -> extract -> merge -> applyShared -> renderActivityLog` remains connected.
- Active sitter editing and ending require the owner device or an authorized paired replacement using the same family name; viewing does not.
- The isolated cache and query versions (`app 33`, styles 36, shared core 17, shared UI 19, training interface 2) agree.
- Only older `frannie-pr7-stable-` caches are deleted; other applications' caches are untouched. Core files use network-first with cached fallback.
- Pairing tokens are temporary; device credentials stay in local storage and D1 stores only hashes.
- No Cloudflare deployment, live D1 mutation, Worker setting change, or secret creation was performed.

## REAL-DEVICE TEST REQUIRED

- Safari invite -> Add to Home Screen -> standalone PWA token handoff.
- Kill/reopen installed iPhone PWA and caretaker alert reappearance.
- iOS WebKit modal/checklist behavior and absence of black surface/freeze.
- Service-worker update arrival on an already installed PWA.
- Two physical devices synchronizing against the deployed Worker/D1.
- Existing connected device credential migration against the live legacy Worker secret.

## Result

Automated/simulated checks: **76 passed** (52 frontend and 24 Worker). Syntax checks: **6 passed**. A phone-sized local browser check also confirmed the restored splash artwork, Training Video Library, Care screen, and absence of browser warnings/errors. Real-device checks remain mandatory and are not claimed as passed.
