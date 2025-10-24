#!/bin/bash
# Script to fix agent frontmatter according to Claude Code documentation
# Removes unsupported 'color' field and fixes model names

cd "$(dirname "$0")"

echo "Fixing agent frontmatter files..."

for file in *.md; do
    # Skip README and SUMMARY files
    if [[ "$file" == "README.md" ]] || [[ "$file" == *"SUMMARY.md" ]]; then
        continue
    fi

    echo "Processing: $file"

    # Remove 'color:' lines
    sed -i '' '/^color:/d' "$file"

    # Fix model names (case-insensitive to lowercase)
    sed -i '' 's/^model: Haiku$/model: haiku/g' "$file"
    sed -i '' 's/^model: Sonnet$/model: sonnet/g' "$file"
    sed -i '' 's/^model: Opus$/model: opus/g' "$file"
    sed -i '' 's/^model: sonet$/model: sonnet/g' "$file"
done

echo "✅ All agent files fixed!"
echo ""
echo "Changes made:"
echo "  - Removed unsupported 'color' field"
echo "  - Fixed model names to lowercase (haiku, sonnet, opus)"
