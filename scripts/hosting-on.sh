#!/bin/bash
# Brings the live site back online by republishing the already-built dist/
# folder. If you've changed frontend code since it was last built, run
# `npm run build` first so the new version actually goes live.
set -e
cd "$(dirname "$0")/.."
firebase deploy --only hosting --project sopan-ai
echo "Site is live: https://sopan-ai.web.app"
