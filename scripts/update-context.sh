#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# ensure ripgrep + zip exist
command -v rg >/dev/null || { echo "Installing ripgrep..."; sudo apt-get update -y && sudo apt-get install -y ripgrep; }
command -v zip >/dev/null || { echo "Installing zip..."; sudo apt-get update -y && sudo apt-get install -y zip; }

echo "== Context: $(basename "$ROOT") =="
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# 0) Redacted env snapshot (names only)
if [ -f .env ]; then
  sed -E 's/=(.*)/=<REDACTED>/' .env > .env.redacted.txt
  echo "• Wrote .env.redacted.txt"
fi

# 1) Update cleanup probes (only the files you asked for, plus a couple helpful ones)
mkdir -p .cleanup

# Where widgets / old bubbles are mentioned
rg -n 'KnowRahWidget|ChatWidget|BotGreeter' src || true > .cleanup/widget-mentions.txt
echo "• Wrote .cleanup/widget-mentions.txt"

# (Nice to have) components & API usage snapshots for the report zip
rg -n 'from ["\']@/components/.*["\']' src || true > .cleanup/components-imports.txt
rg -n "fetch\\('/api/.*'|\\\"/api/.*\\\"" src || true > .cleanup/api-calls.txt

# 2) Source zip (tracked + untracked; excludes heavy/secret stuff)
zip -qr knowrah-site-src.zip . \
  -x "node_modules/*" ".next/*" ".vercel/*" ".git/*" "*.log" \
     "coverage/*" "dist/*" "build/*" \
     ".env" ".env.*" "knowrah-site-src.zip" "cleanup-report.zip"

echo "• Wrote knowrah-site-src.zip ($(du -h knowrah-site-src.zip | cut -f1))"

# 3) Cleanup report zip (just the .cleanup folder)
zip -qr cleanup-report.zip .cleanup
echo "• Wrote cleanup-report.zip ($(du -h cleanup-report.zip | cut -f1))"

echo "Done."
