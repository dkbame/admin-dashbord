#!/bin/bash
# Verification script for macOS App Discovery project setup

echo "🔍 Verifying macOS App Discovery Project Setup"
echo "=============================================="
echo ""

# Check if project opens
if [ -f "AppStoreDiscovery-macOS.xcodeproj/project.pbxproj" ]; then
    echo "✅ Xcode project file exists and should open"
else
    echo "❌ Xcode project file missing"
    exit 1
fi

# Check for basic app files
echo "📱 Checking basic app files:"
basic_files=(
    "AppStoreDiscovery-macOS/AppStoreDiscoveryApp.swift"
    "AppStoreDiscovery-macOS/ContentView.swift"
    "AppStoreDiscovery-macOS/Assets.xcassets"
    "AppStoreDiscovery-macOS/AppStoreDiscovery_macOS.entitlements"
)

for file in "${basic_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

echo ""

# Check Metal compatibility files (MOST IMPORTANT)
echo "🛡️ Checking Metal Compatibility Files:"
metal_files=(
    "AppStoreDiscovery-macOS/Utils/MetalCompatibility.swift"
    "AppStoreDiscovery-macOS/Utils/MetalErrorHandler.swift"
    "AppStoreDiscovery-macOS/Utils/SafeViewPresentation.swift"
    "AppStoreDiscovery-macOS/Utils/AsyncImageCompat.swift"
)

for file in "${metal_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (CRITICAL - missing Metal compatibility)"
    fi
done

echo ""

# Check Models
echo "📊 Checking Models:"
model_files=(
    "AppStoreDiscovery-macOS/Models/AppModel.swift"
    "AppStoreDiscovery-macOS/Models/Category.swift"
)

for file in "${model_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file"
    fi
done

echo ""

# Check Services
echo "⚙️ Checking Services:"
service_files=(
    "AppStoreDiscovery-macOS/Services/SupabaseManager.swift"
    "AppStoreDiscovery-macOS/Services/APIService.swift"
)

for file in "${service_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file"
    fi
done

echo ""

# Check Views
echo "🎨 Checking Views:"
view_files=(
    "AppStoreDiscovery-macOS/Views/HomeView.swift"
    "AppStoreDiscovery-macOS/Views/CategoriesView.swift"
    "AppStoreDiscovery-macOS/Views/SearchView.swift"
    "AppStoreDiscovery-macOS/Views/FavoritesView.swift"
    "AppStoreDiscovery-macOS/Views/SidebarView.swift"
    "AppStoreDiscovery-macOS/Views/SettingsView.swift"
    "AppStoreDiscovery-macOS/Views/AppDetailView.swift"
)

for file in "${view_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file"
    fi
done

echo ""

# Check Components
echo "🧩 Checking Components:"
component_files=(
    "AppStoreDiscovery-macOS/Components/AppCard.swift"
)

for file in "${component_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file"
    fi
done

echo ""

# Count total files
total_files=$(find AppStoreDiscovery-macOS -name "*.swift" | wc -l)
echo "📄 Total Swift files found: $total_files"

if [ "$total_files" -eq 18 ]; then
    echo "✅ Correct number of Swift files (18)"
else
    echo "⚠️  Expected 18 Swift files, found $total_files"
fi

echo ""

# Summary
echo "📋 SUMMARY:"
echo "==========="
if [ -f "AppStoreDiscovery-macOS.xcodeproj/project.pbxproj" ]; then
    echo "✅ Xcode project: READY TO OPEN"
else
    echo "❌ Xcode project: CORRUPTED"
fi

metal_count=$(find AppStoreDiscovery-macOS/Utils -name "*.swift" 2>/dev/null | wc -l)
if [ "$metal_count" -eq 4 ]; then
    echo "✅ Metal compatibility: ALL FILES PRESENT"
else
    echo "❌ Metal compatibility: MISSING FILES ($metal_count/4)"
fi

if [ "$total_files" -ge 16 ]; then
    echo "✅ App files: SUFFICIENT FOR BUILDING"
else
    echo "❌ App files: INSUFFICIENT ($total_files < 16)"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo "1. Open: open AppStoreDiscovery-macOS.xcodeproj"
echo "2. Add all files to project through Xcode interface"
echo "3. Add Supabase dependency"
echo "4. Build and test Metal compatibility"
echo ""
echo "📖 See: ADD_FILES_TO_PROJECT.md for detailed instructions"
echo ""

# Check if test scripts are available
if [ -f "test-metal-fix.sh" ]; then
    echo "🧪 Test script available: ./test-metal-fix.sh"
fi

if [ -f "fix-nvidia-metal.sh" ]; then
    echo "🔧 Manual fix available: ./fix-nvidia-metal.sh"
fi

echo ""
echo "🎉 Project verification complete!" 