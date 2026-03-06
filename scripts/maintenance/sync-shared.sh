#!/bin/bash
# ⚕️ HUMAN CHECK - Shared Kernel Sync
# Copies the 'source of truth' (Producer) types to Consumer.
# Usage: ./scripts/sync-shared.sh

SOURCE="backend/producer/src/types/appointment-event.ts"
DEST="backend/consumer/src/types/appointment-event.ts"

if [ -f "$SOURCE" ]; then
    echo "🔄 Syncing Shared Kernel..."
    echo "   Source: $SOURCE"
    echo "   Dest:   $DEST"
    
    # Ensure destination dir exists
    mkdir -p $(dirname "$DEST")
    
    # Copy with overwrite
    cp "$SOURCE" "$DEST"
    
    # Verify
    if diff "$SOURCE" "$DEST" > /dev/null; then
        echo "✅ Sync Successful. Contracts are identical."
    else
        echo "❌ Sync Failed."
        exit 1
    fi
else
    echo "❌ Source file not found: $SOURCE"
    exit 1
fi
