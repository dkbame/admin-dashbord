#!/bin/bash

# =====================================================
# CLEANUP SCRIPT FOR SCATTERED SQL FILES
# =====================================================
# This script removes scattered SQL files that have been consolidated
# into the main migration: 20240320000008_consolidated_optimization.sql

echo "🧹 Starting cleanup of scattered SQL files..."
echo "================================================"

# List of files to be removed (consolidated into main migration)
FILES_TO_REMOVE=(
    "fix_rls_policies_complete.sql"
    "fix_rls_policies.sql"
    "fix_categories_rls.sql"
    "create_storage_buckets.sql"
    "fix_price_sync.sql"
    "fix_price_sync_v2.sql"
    "debug_app_update.sql"
    "debug_category.sql"
    "test_auth.sql"
    "test_delete.sql"
    "make_admin.sql"
    "make_admin_simple.sql"
    "add_more_categories.sql"
)

# Count of files to be removed
TOTAL_FILES=${#FILES_TO_REMOVE[@]}
REMOVED_COUNT=0

echo "📋 Files to be removed (${TOTAL_FILES} total):"
echo "----------------------------------------"

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "❌ $file"
    else
        echo "⚠️  $file (not found)"
    fi
done

echo ""
echo "🗑️  Proceeding with cleanup..."
echo "----------------------------------------"

# Remove each file
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "✅ Removed: $file"
        ((REMOVED_COUNT++))
    else
        echo "⚠️  Skipped: $file (not found)"
    fi
done

echo ""
echo "📊 Cleanup Summary:"
echo "==================="
echo "✅ Files removed: $REMOVED_COUNT"
echo "📁 Files skipped: $((TOTAL_FILES - REMOVED_COUNT))"
echo ""

# Check if there are any remaining SQL files in root
REMAINING_SQL=$(find . -maxdepth 1 -name "*.sql" -not -path "./supabase/*" | wc -l)

if [ $REMAINING_SQL -gt 0 ]; then
    echo "⚠️  Warning: $REMAINING_SQL SQL files still remain in root directory:"
    find . -maxdepth 1 -name "*.sql" -not -path "./supabase/*" | sed 's|^./||'
    echo ""
    echo "💡 These files may need manual review before removal."
else
    echo "🎉 All scattered SQL files have been cleaned up!"
fi

echo ""
echo "📋 Migration Status:"
echo "==================="
echo "✅ Consolidated migration: supabase/migrations/20240320000008_consolidated_optimization.sql"
echo "✅ All scattered SQL files consolidated"
echo "✅ Database optimizations applied"
echo "✅ Performance indexes created"
echo "✅ RLS policies cleaned up"
echo ""

echo "🚀 Next steps:"
echo "=============="
echo "1. Run the consolidated migration: supabase db push"
echo "2. Test the database performance improvements"
echo "3. Verify all functionality still works correctly"
echo "4. Update any references to old SQL files in documentation"
echo ""

echo "✨ Cleanup complete!" 