#!/usr/bin/env bash
set -euo pipefail

# Parse flags
REBUILD=false
RESET=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --reset)
            RESET=true
            shift
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

set -- "${POSITIONAL_ARGS[@]}"

CLS=${1:-mongors}
BASE_DIR="$HOME/.containers/$CLS"

echo "================================================"
echo "  MongoDB Replica Set Installer"
echo "================================================"
echo "[DEBUG] REBUILD: $REBUILD"
echo "[DEBUG] RESET: $RESET"
echo "[DEBUG] BASE_DIR: $BASE_DIR"
echo ""

if [[ "$RESET" = true ]]; then
    echo "🛑 Stopping MongoDB ReplicaSet '$CLS'..."
    docker compose down -v

    echo "🗑️  Resetting MongoDB setup..."
    sudo rm -rf "$BASE_DIR"
    echo ""
fi

echo "📦 Setting up MongoDB ReplicaSet '$CLS' at $BASE_DIR"
mkdir -p "$BASE_DIR"

if [ "$REBUILD" = true ]; then
    echo "🔧 Building Docker containers (with --no-cache)..."
    COMPOSE_BAKE=true docker compose build --no-cache
fi

echo "🚀 Starting containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for initialization (10 seconds)..."
sleep 10

echo ""
echo "📊 Container Status:"
docker compose ps 

echo ""
echo "================================================"
echo "  ✅ MongoDB Replica Set Setup Complete!"
echo "================================================"
echo ""
echo "📊 Check logs:"
echo "   docker compose logs -f"
echo ""
echo "🔍 Check replica status:"
echo "   docker exec -it mongodb_clstr mongosh -u root -p pa55w0rd --eval 'rs.status()'"
echo ""
echo "🔌 Connect from host:"
echo "   mongosh 'mongodb://root:pa55w0rd@localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0'"
echo ""
echo "🧪 Test connection:"
echo "   docker exec -it mongodb_clstr mongosh -u root -p pa55w0rd --eval 'db.adminCommand({ isMaster: 1 })'"
echo ""