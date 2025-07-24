#!/bin/bash

echo "🚀 Launching macOS App Discovery with Debug Output"
echo "=================================================="

# First, build the app
echo "Building app..."
xcodebuild -project AppStoreDiscovery-macOS.xcodeproj -scheme AppStoreDiscovery-macOS build

if [[ $? -eq 0 ]]; then
    echo "✅ Build successful"
    echo ""
    echo "🔍 GPU Information:"
    system_profiler SPDisplaysDataType | grep "Chipset Model:" | head -1
    echo ""
    echo "🛡️ Expected Metal Compatibility: Software Rendering (NVIDIA detected)"
    echo ""
    echo "📱 Launching app with debug output..."
    echo "   Watch for Metal compatibility messages in the output below."
    echo "   Click on an app (like Fantastical) to test the crash fix."
    echo ""
    echo "=================================================="
    
    # Launch the app and capture all output
    /Users/imac/Library/Developer/Xcode/DerivedData/AppStoreDiscovery-macOS-*/Build/Products/Debug/AppStoreDiscovery-macOS.app/Contents/MacOS/AppStoreDiscovery-macOS
    
    echo ""
    echo "=================================================="
    echo "App has exited. Check the debug output above for:"
    echo "  🚀 App startup messages"
    echo "  🔧 Metal compatibility status"
    echo "  🖱️ App click events"
    echo "  🛡️ Safety measures applied"
    echo "  ❌ Any crash information"
else
    echo "❌ Build failed - check Xcode for errors"
fi 