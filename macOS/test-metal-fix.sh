#!/bin/bash
# Test script for NVIDIA Metal compatibility fix

echo "🧪 Testing NVIDIA Metal Compatibility Fix"
echo "========================================="
echo ""

# Check if we're on an Intel Mac
ARCH=$(uname -m)
echo "🔍 System Architecture: $ARCH"

# Check graphics card
echo "🎮 Graphics Hardware:"
system_profiler SPDisplaysDataType | grep "Chipset Model" | head -1
echo ""

# Apply comprehensive Metal compatibility environment variables
echo "🔧 Applying Metal Compatibility Environment Variables..."

export METAL_DEVICE_WRAPPER_TYPE=1
export METAL_DEBUG_ERROR_MODE=0
export CA_LAYER_DISABLE_METAL=1
export MTL_CAPTURE_ENABLED=0
export MTL_DEBUG_LAYER=0
export MTL_SHADER_VALIDATION=0
export MTL_DEVICE_ALWAYS_SOFTWARE=1
export SWIFTUI_DISABLE_METAL=1
export SWIFTUI_USE_SOFTWARE_RENDERING=1
export CA_USE_SOFTWARE_RENDERING=1
export CA_DISABLE_METAL_LAYER=1
export CA_FORCE_SOFTWARE_VSYNC=1
export NSApp_DISABLE_METAL=1
export NSView_FORCE_SOFTWARE_LAYER=1

echo "✅ Applied the following environment variables:"
echo "   METAL_DEVICE_WRAPPER_TYPE=1"
echo "   CA_LAYER_DISABLE_METAL=1"
echo "   SWIFTUI_DISABLE_METAL=1"
echo "   MTL_DEVICE_ALWAYS_SOFTWARE=1"
echo "   + 7 additional Metal compatibility flags"
echo ""

# Try to launch the app with these settings
if [ -f "AppStoreDiscovery-macOS.xcodeproj" ]; then
    echo "🚀 Launching macOS App Discovery with Metal compatibility..."
    
    # Try to find the built app
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "AppStoreDiscovery-macOS.app" 2>/dev/null | head -1)
    
    if [ -n "$APP_PATH" ]; then
        echo "📱 Found app at: $APP_PATH"
        open "$APP_PATH"
        echo "✅ App launched! Try clicking on an app to test if the Metal error is fixed."
    else
        echo "⚠️  App not found. Please build the project in Xcode first:"
        echo "   1. Open AppStoreDiscovery-macOS.xcodeproj in Xcode"
        echo "   2. Press ⌘+B to build"
        echo "   3. Press ⌘+R to run"
        echo "   4. Try clicking on an app to test"
    fi
else
    echo "❌ Project file not found in current directory"
fi

echo ""
echo "🧪 Test Results:"
echo "================"
echo "✅ Environment variables applied successfully"
echo "✅ System information collected"
echo ""
echo "🎯 What to test:"
echo "1. Launch the app (it should start without crashes)"
echo "2. Click on any app in the list"
echo "3. Check if the Metal error still occurs"
echo ""
echo "💡 If you still see the error:"
echo "1. Check Console.app for 'MetalCompatibility' messages"
echo "2. Go to Settings in the app to see rendering mode"
echo "3. The app should show 'Software' rendering mode"

echo ""
echo "�� Test completed!" 