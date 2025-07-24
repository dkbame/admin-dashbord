#!/bin/bash

echo "🔍 Testing GPU Detection and Metal Compatibility"
echo "================================================"

echo ""
echo "1. System GPU Information:"
echo "   Using system_profiler SPDisplaysDataType..."

# Get GPU info the same way our app does
GPU_INFO=$(system_profiler SPDisplaysDataType | grep -E "(Chipset Model|Graphics):" | head -1)
echo "   $GPU_INFO"

echo ""
echo "2. NVIDIA Detection Test:"
GPU_TEXT=$(echo "$GPU_INFO" | tr '[:upper:]' '[:lower:]')

if [[ $GPU_TEXT == *"nvidia"* ]] || [[ $GPU_TEXT == *"geforce"* ]] || [[ $GPU_TEXT == *"quadro"* ]]; then
    echo "   ✅ NVIDIA GPU DETECTED - Software rendering should be enabled"
    SHOULD_USE_SOFTWARE=true
else
    echo "   ❌ Non-NVIDIA GPU - Hardware rendering should be used"
    SHOULD_USE_SOFTWARE=false
fi

echo ""
echo "3. Expected Metal Compatibility Settings:"
if [[ $SHOULD_USE_SOFTWARE == true ]]; then
    echo "   🔧 The app should apply these environment variables:"
    echo "      METAL_DEVICE_WRAPPER_TYPE=1"
    echo "      CA_LAYER_DISABLE_METAL=1"
    echo "      SWIFTUI_DISABLE_METAL=1"
    echo "      CA_USE_SOFTWARE_RENDERING=1"
    echo "      MTL_DEVICE_ALWAYS_SOFTWARE=1"
else
    echo "   ⚡ Hardware acceleration should be used"
fi

echo ""
echo "4. Testing App Launch with Metal Compatibility:"
echo "   Building and launching the app..."

# Build the app
echo "   Building..."
cd AppStoreDiscovery-macOS.xcodeproj/.. 2>/dev/null || cd .
xcodebuild -project AppStoreDiscovery-macOS.xcodeproj -scheme AppStoreDiscovery-macOS build 2>/dev/null

if [[ $? -eq 0 ]]; then
    echo "   ✅ Build successful"
    
    # Check if we should launch with monitoring
    if [[ $SHOULD_USE_SOFTWARE == true ]]; then
        echo ""
        echo "   🛡️  NVIDIA GPU detected - the app should automatically:"
        echo "      - Detect your GPU safely (without Metal crashes)"
        echo "      - Apply software rendering environment variables"
        echo "      - Display 'Software' rendering mode in Settings"
        echo "      - Prevent crashes when clicking on apps"
        echo ""
        echo "   Try launching the app and clicking on apps - it should NOT crash!"
    fi
else
    echo "   ❌ Build failed - check Xcode for errors"
fi

echo ""
echo "================================================"
echo "GPU Detection Test Complete" 