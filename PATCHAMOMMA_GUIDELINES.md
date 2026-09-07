# Patchamomma 2026 — Build Phase Guidelines

*(saved verbatim from the kickoff email, for reference)*

Congratulations! You have successfully entered the Build Phase of Patchamomma 2026! ANDDDDD....

You start tomorrow!

## 1. Idea

This is your entitlement!!! Come up with some industry-grade, groundbreaking, exceptional ideas that are solving problems in your real world whether it is work or society or your personal life. It can be a ground breaking product or application or research ideas as well. Depends on what your interest is in. Or you can be the next big entrepreneur! Yours can be the next big idea!!!

Make it Data driven.

No restriction on industry or problem statement. But since you are all experienced industry professionals, you are expected to set a standard with your ideas.

## 2. Data

You can use sample synthetic Data for your idea, or you can use BigQuery Public Dataset or Kaggle Datasets. Do not use / share any confidential work-related Data that would impact you in any way.

## 3. Technology

a. Use Google / Google Cloud Tech Stack: Data, Databases, Storage, AI, ML, Agentic AI, Generative AI, Security, Serverless, Analytics, Reporting, Deep Insights, ETL, Vibe Coding and other tools on Google Cloud!!!

b. You have options like: Google AI Studio (for Gemini API key), BigQuery, Firebase (Firestore), Data Studio, Looker, Cloud Run, Pub/Sub, Knowledge Catalog etc. and so many more options, some we covered in the last 5 sessions and some we did not.

c. There are frameworks that are open sourced by Google Cloud like: ADK (Agent Development Kit) for building your Multi Agent Applications.

d. There is an open source framework called MCP Toolbox for Databases that you can consider for orchestrating your Agentic Architecture!

e. You can also build on-prem with AlloyDB Omni (once downloaded its free for your on-prem access) and Gemma and you can host at your own end.

So many options!!! Let's get started...

## 4. Platform

a. You will have to use your 300 USD free trial credits for the build Phase. https://console.cloud.google.com/freetrial

You'll be asked to use your UPI / Credit Card to set up the trial billing account. But don't worry it wont charge unless you use up all the free credits and move to a paid account yourself. Read FAQ: https://cloud.google.com/signup-faqs?e=48754805 / video: https://www.youtube.com/shorts/53sl9X0X5dQ

Once you start building the top 100 earliest ones to reach out with the projects will get $50 to top up on top of the $300.

b. Also it is free to use Google AI Studio to start building. But you just use at least one of the Cloud Services (BigQuery is free to start even without a billing account. Also Firebase/Firestore is free). With Firebase you have database, deployment and Cloud Storage for Firebase free as well.

c. You'll get an API KEY (free access to Gemini family of models) from AI Studio for Gemini API.

d. Google AI Studio gives you 2 free Cloud Run Deployments for your applications.

e. If you use up your free options and you want to stick to free deployment options you can choose render, netlify etc. (worst case only).

## 5. Team

It is encouraged to keep your teams to 1 to 2 members. But if you happen to have an idea where multiple team members are required, then go for it. Make sure there is always one person who communicates project logistics and progress in the tracker that will be sent in the upcoming days.

## 6. Tracker

There will be a tracker (app/Link) shared in the upcoming week so you can start updating your progress.

## 7. Timeline

You will start building TOMORROW! There is no idea submission phase. You come up with an industry-grade, high quality idea and you start building with your team.

- Start Build: Aug 15
- First Checkpoint Entry: Aug 20
- Second Checkpoint: Aug 28
- Final Checkpoint: Sep 5
- **Lock Submission: Sep 7 (No extensions)**
- Results: Sep 10
- Finale: Sep 24

## 8. Connect and Communicate

Discord: https://discord.gg/fgHGJb3R3

---

# Compliance Check — Sopan AI against these guidelines

*(assessed 2026-09-08, against the actual deployed project)*

| Guideline | Status | Notes |
|---|---|---|
| **1. Idea** — industry-grade, data-driven | ✅ Met | Adaptive AI/ML learning platform: real diagnostic, RAG-grounded plans, in-browser ML training with a real math visualizer, AI tutor chat. Not a toy CRUD app — has a real backend, real data pipelines, real ML. |
| **2. Data** — synthetic, BigQuery Public, or Kaggle; no confidential data | ⚠️ Mostly met, one nuance | Uses BigQuery's public StackOverflow dataset directly (literal match). Also pulls real MMLU/AGIEval benchmark data via Hugging Face's datasets-server and live arXiv/Hacker News APIs — not literally "BigQuery or Kaggle," but genuinely public, non-confidential, real data, in the clear spirit of the rule. No synthetic or confidential data used anywhere. |
| **3. Technology** — Google Cloud stack | ✅ Met | Firebase (Firestore, Auth, Cloud Functions, Hosting), Gemini API via AI Studio key, BigQuery public dataset. Cloud Functions 2nd gen run on Cloud Run under the hood. ADK / MCP Toolbox deliberately not used — this app's single-agent RAG+chat pattern doesn't need multi-agent orchestration; that's a design choice, not a gap, since the guidelines list these as options, not requirements. |
| **4. Platform** — $300 trial credit, billing activated, ≥1 Cloud service | ✅ Met | Blaze billing confirmed active on the project. Uses Firebase (Firestore/Functions/Hosting, all free-tier) plus BigQuery. Real Gemini API key from AI Studio. |
| **5. Team** — 1-2 members, one point of contact | ⏳ Not code-verifiable | This is about your actual team roster, not something I have visibility into — confirm this yourself for the tracker. |
| **6. Tracker** — progress updates | ⏳ Not code-verifiable | Depends on whatever tracker link/app Patchamomma sends — check email/Discord for it. |
| **7. Timeline** | 🔴 **Likely past deadline** | **Today is 2026-09-08. Lock Submission was Sep 7, explicitly "No extensions."** The app is built and deployed live today, one day after that date. I have no visibility into your email/Discord — it's possible the organizers announced an extension or the tracker is still accepting entries, but based on the guidelines as written, this is now past the stated hard deadline. Worth confirming with organizers/Discord immediately rather than assuming either way. |
| **8. Connect** | ⏳ Not code-verifiable | Discord — your own usage, not code-related. |

**Bottom line**: the actual technical build is solidly compliant with the Idea/Data/Technology/Platform requirements — nothing there should be a concern. The one real, urgent issue is the timeline: today is after the stated no-extensions lock submission date. That's worth checking directly with Patchamomma (Discord, email, or the tracker once you have it) rather than something I can resolve — I can't verify whether an extension was granted.
