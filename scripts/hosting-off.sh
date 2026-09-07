#!/bin/bash
# Takes the live site offline — visitors get a 404, nothing is deleted.
# Cloud Functions and Firestore data are untouched; this only blocks the
# public website. Run hosting-on.sh to bring it back.
set -e
cd "$(dirname "$0")/.."
firebase hosting:disable --project sopan-ai --force
echo "Site is offline: https://sopan-ai.web.app now returns 404."
