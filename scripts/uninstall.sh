#!/usr/bin/env bash
set -euo pipefail

CLS=${1:-mongors}
BASE_DIR="$HOME/.containers/$CLS"

echo "================================================"
echo "  MongoDB Replica Set Uninstaller"
echo "================================================"
echo ""
echo "🧹 Stopping MongoDB ReplicaSet '$CLS'..."
docker compose down -v

echo ""
echo "🗑️  Remove container data from $BASE_DIR? (Y/N)"
read -r CONFIRM

if [[ "$CONFIRM" == "Y" || "$CONFIRM" == "y" ]]; then
    sudo rm -rf "$BASE_DIR"
    echo "✅ Data removed from $BASE_DIR"
else
    echo "❎ Skipped data removal. Data preserved at $BASE_DIR"
fi

echo ""
echo "✅ Uninstall complete!"