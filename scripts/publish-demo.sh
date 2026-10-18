#!/bin/sh
# Builds the static explorer demo from the synthetic database and publishes demo/dist to the
# gh-pages branch, which GitHub Pages serves at https://exidium.github.io/researchRepo/.
# Needs only `repo` scope (no GitHub Actions). Run from the project root: ./scripts/publish-demo.sh
set -eu
cd "$(dirname "$0")/.."
pnpm demo:data
pnpm --dir demo install --ignore-workspace
pnpm --dir demo build
tmp=$(mktemp -d)
cp -R demo/dist/. "$tmp"/
touch "$tmp/.nojekyll"
remote=$(git remote get-url origin)
( cd "$tmp" && git init -q && git checkout -q -b gh-pages && git add -A && git -c user.name="${GIT_AUTHOR_NAME:-publish-demo}" -c user.email="${GIT_AUTHOR_EMAIL:-publish-demo@local}" -c commit.gpgsign=false commit -q -m "Publish demo $(date -u +%Y-%m-%dT%H:%MZ)" && git push -q --force "$remote" gh-pages )
rm -rf "$tmp"
echo "published to gh-pages"
