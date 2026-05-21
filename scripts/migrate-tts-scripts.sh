#!/usr/bin/env bash
# 將 src/content/posts/ 下的 .tts-script.txt 搬移至 src/tts/
set -euo pipefail
find src/content/posts -name "*.tts-script.txt" | while read src; do
  rel="${src#src/content/posts/}"
  cat_dir="src/tts/$(dirname "$rel")"
  mkdir -p "$cat_dir"
  mv "$src" "$cat_dir/$(basename "$rel")"
  echo "moved: $src -> $cat_dir/$(basename "$rel")"
done
echo "遷移完成。"
