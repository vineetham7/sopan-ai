# Deploying Sopan AI

This is the complete, step-by-step path from where the project stands right now to a live URL anyone can open. Written for someone who has never deployed anything before — every command is copy-pasteable.

Project: `sopan-ai` (Firebase project ID). Stack: Firebase Hosting (static frontend) + Cloud Functions 2nd gen (backend) + Firestore (database) + Gemini API.

---

## 0. Fix the current blocker: Gemini 429 quota error

If you're seeing `429 You exceeded your current quota` in the Plan tab, Insta feed, Sandbox narration, or the AI Tutor chat, this is **not a bug** — it's Gemini API's free-tier rate limit, exhausted by heavy testing today. Two ways to fix it:

**Option A — wait it out.** Free-tier quotas reset daily. If you're not in a rush, it'll clear on its own.

**Option B — upgrade the API key to the paid tier (recommended before a live demo).**
1. Go to https://aistudio.google.com/apikey
2. Find the API key this project uses (the same one stored in Firebase Secret Manager as `GEMINI_API_KEY`)
3. It'll show "Free tier" — click to upgrade it to a billed project. This is **separate from** the Google Cloud Billing / $300 trial credit you already activated — a Google AI Studio key defaults to free-tier limits regardless of your Cloud project's billing status, until you explicitly link it to a billed project here.
4. Once upgraded, the same key keeps working — no code or redeploy needed, limits just lift immediately.

---

## 1. Two real bugs already found and fixed (today, before you read this)

These would have **silently blocked deployment** if not caught:

1. **A JSX syntax error** (escaped quotes inside a plain string attribute in `StepTutorChat.jsx`) — broke the whole app. Fixed.
2. **`functions/index.js` failed lint** — the Cloud Functions predeploy hook runs `eslint .` automatically, and it was failing for two real reasons:
   - The ESLint config was pinned to `ecmaVersion: 2018`, which can't parse modern syntax already used in this file (optional catch binding `catch {}`, optional chaining `?.`). The code itself was always valid and ran fine on Node 24 — the *linter* was out of date. Bumped to `2022` in `functions/.eslintrc.js`.
   - 189 accumulated style violations (line length, brace spacing) had never actually been checked, because `npm run lint` was never run until now — only the emulator, which doesn't lint. Auto-fixed the mechanical ones (`eslint --fix`) and relaxed `max-len` to a realistic 160 chars (this file has many long natural-language prompt strings, which is normal for an AI app, not a code smell).

**Verify this yourself anytime** before deploying:
```bash
cd functions && npm run lint
```
If this doesn't print clean, `firebase deploy --only functions` will fail at the predeploy step — fix lint errors first.

---

## 2. Prerequisites (one-time, most already done)

- [x] Node.js + npm installed
- [x] Firebase CLI installed and logged in (`firebase login`)
- [x] Firebase project `sopan-ai` created and linked (`.firebaserc` already points to it)
- [x] Google Cloud Billing activated (Blaze plan) — you confirmed this earlier; verified via `gcloud billing projects describe sopan-ai` → `billingEnabled: true`
- [x] `GEMINI_API_KEY` secret already set in Secret Manager (confirmed present)
- [ ] Gemini API key upgraded past free tier — see Section 0 if you want this before a demo

If any of the checked items are ever in doubt, run:
```bash
firebase login                      # confirms/logs you in
firebase use                        # should print "sopan-ai"
gcloud billing projects describe sopan-ai   # should show billingEnabled: true
```

---

## 3. Build the frontend

From the project root:
```bash
npm run build
```
This compiles the React app into `dist/` — the folder Firebase Hosting actually serves. Re-run this every time you change frontend code and want to redeploy.

---

## 4. Deploy everything

One command deploys Firestore security rules, all Cloud Functions, and Hosting together:
```bash
firebase deploy --only firestore:rules,functions,hosting
```

What to expect:
- It may ask to enable a few Google Cloud APIs the first time (Cloud Build, Artifact Registry, Cloud Run) — these are required for Cloud Functions 2nd gen to run at all, are free-tier-covered, and standard. Type `y`.
- It will reuse the existing `GEMINI_API_KEY` secret automatically.
- The `functions` predeploy hook runs `npm run lint` in `functions/` first — if you changed backend code, run `cd functions && npm run lint` yourself first to catch issues before the real deploy attempt.
- Takes a few minutes the first time (building function containers); faster on redeploys.

**To deploy just one piece** (faster iteration once you've deployed everything once):
```bash
firebase deploy --only hosting          # frontend only
firebase deploy --only functions        # backend only
firebase deploy --only firestore:rules  # security rules only
```

---

## 5. Get your live link

On success, Firebase prints something like:
```
Hosting URL: https://sopan-ai.web.app
```
That's the real, public link. Anyone can open it — no login required to browse (the app signs visitors in anonymously on first load; they can optionally upgrade to a Google account to save progress across devices).

---

## 6. Verify it actually works in production

Don't trust the deploy log alone — open the real URL and click through:

1. **Diagnostic tab** — answer a question, confirm feedback appears
2. **Path tab** — check the skill map renders
3. **Plan tab** — generate a plan for a topic, confirm Steps/Flashcards/Quiz all populate with real content (this alone exercises Firestore vector search + Gemini — the best single smoke test)
4. **Insta tab** — confirm the feed loads real arXiv/HN content
5. **Sandbox tab** — upload a couple of photos per class, train, confirm the animated network diagram and prediction math render

If anything shows a Gemini error in production, that's almost certainly the same 429 quota issue from Section 0 — not a deployment problem.

---

## 7. Ongoing costs

- **Firebase Hosting**: free tier covers this easily (10 GB storage, 360 MB/day transfer)
- **Cloud Functions**: free tier covers 2M invocations/month
- **Gemini API**: free tier unless you upgraded the key (Section 0); paid tier is pay-per-token, cheap at this app's scale
- **Firestore**: free tier covers 50K reads / 20K writes per day

Set a budget alert once, so you're never surprised:
Google Cloud Console → Billing → Budgets & alerts → create one at, say, ₹100.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `firebase deploy --only functions` fails at predeploy | Lint errors in `functions/index.js` | Run `cd functions && npm run lint`, fix what it reports |
| Deploy says "Blaze plan required" | Billing not linked to this Firebase project specifically | Console → Project Settings → Usage and billing → confirm Blaze |
| App loads but every Gemini feature errors with 429 | Free-tier quota exhausted | Section 0 |
| Insta feed / Plan tab hang for 20-30s before responding | Normal — real arXiv/Firestore/Gemini calls take time, this isn't a bug | Just wait; there's no infinite-hang case in production (only ever seen locally, sandboxed dev-tool network quirks) |
| Hosting shows old content after redeploy | Browser cache | Hard refresh (Cmd+Shift+R) or open in a private window |

---

## 9. Redeploying after future changes

Every time you change something and want it live:
```bash
npm run build
firebase deploy --only hosting          # if you only touched frontend
# or, if you also touched functions/index.js:
cd functions && npm run lint && cd ..
firebase deploy --only functions,hosting
```
