#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/templates/mcp-server"

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <package-name> [description]"
  echo "Example: $0 linear-bootstrap \"Linear project bootstrapping MCP server\""
  exit 1
fi

NAME="$1"
DESCRIPTION="${2:-"MCP server package"}"
DEST="$REPO_ROOT/packages/$NAME"

if [ -d "$DEST" ]; then
  echo "Error: packages/$NAME already exists"
  exit 1
fi

# Title case: linear-bootstrap -> Linear Bootstrap
TITLE=$(echo "$NAME" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

echo "Creating packages/$NAME from mcp-server template..."

cp -r "$TEMPLATE_DIR" "$DEST"

# Replace placeholders
find "$DEST" -type f | while read -r file; do
  sed -i "s/{{package-name}}/$NAME/g" "$file"
  sed -i "s/{{server-name}}/$NAME/g" "$file"
  sed -i "s/{{Server Title}}/$TITLE/g" "$file"
  sed -i "s/{{Brief description}}/$DESCRIPTION/g" "$file"
  sed -i "s/{{Brief description of what this MCP server does and what problem it solves.}}/$DESCRIPTION/g" "$file"
done

echo "Created packages/$NAME"
echo ""
echo "Next steps:"
echo "  cd packages/$NAME"
echo "  pnpm install"
echo "  # Edit src/main.ts to add your tools"
echo "  # Update README.md with tool documentation"
