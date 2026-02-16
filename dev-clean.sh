#!/bin/bash

# Clean Next.js cache to prevent Turbopack database corruption
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "✅ Cache cleared!"
echo "🚀 Starting Next.js dev server..."

# Start the dev server
NEXT_PRIVATE_SKIP_TURBOPACK=1 next dev
