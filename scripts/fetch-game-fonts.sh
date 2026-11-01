#!/usr/bin/env bash
set -euo pipefail
# Two SIL OFL font families, fetched from a pinned upstream revision.
# SHA-1 of the original Git blobs ensures reproducible font bytes.
REV=7af038d32866b387c64ef8e644abf5c303e48db6
BASE="https://raw.githubusercontent.com/CodePlayer/webfont-noto/$REV"
SANS=dist/NotoSans/NotoSansCJKsc-hinted/subset/NotoSansCJKsc-hinted-slim
SERIF=dist/NotoSerif/NotoSerifCJKsc-hinted/subset/NotoSerifCJKsc-hinted-slim
mkdir -p site/assets/fonts
get(){
  local path="$1" name="$2" sha="$3" actual
  curl -fsSL --retry 3 --connect-timeout 15 --max-time 120 \
    "$BASE/$path" -o "site/assets/fonts/$name"
  actual="$(git hash-object "site/assets/fonts/$name")"
  if [[ "$actual" != "$sha" ]];then
    echo "Font integrity failed: $name: $actual, expected $sha" >&2
    exit 1
  fi
}
get "$SANS/NotoSansCJKsc-Regular.woff2" "PaperSans-Regular.woff2" \
  "248fb1abc0f81db3c8e9c5cb17164d56cbbb515f"
get "$SERIF/NotoSerifCJKsc-Medium.woff2" "PaperSerif-Medium.woff2" \
  "b454f7bb70bf5c38b5b98221931dee4399bc819e"
get "$SANS/LICENSE_OFL.txt" "OFL-LICENSE.txt" \
  "d952d62c065f3f35fb83a173496e90b21525aef3"
echo "PASS: pinned self-hosted CJK game fonts & OFL license"
