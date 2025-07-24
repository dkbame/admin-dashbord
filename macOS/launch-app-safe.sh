#!/bin/bash

echo "🛡️ Launching macOS App Discovery with PRE-SET Metal Protection"
echo "=============================================================="

echo "🔍 Checking GPU type..."
GPU_INFO=$(system_profiler SPDisplaysDataType | grep "Chipset Model:" | head -1)
echo "   $GPU_INFO"

if [[ $GPU_INFO == *"NVIDIA"* ]] || [[ $GPU_INFO == *"GeForce"* ]]; then
    echo "⚠️  NVIDIA GPU detected - applying COMPREHENSIVE Metal protection"
    
    # Set ALL possible Metal-disabling environment variables BEFORE launching
    export METAL_DEVICE_WRAPPER_TYPE=1
    export CA_LAYER_DISABLE_METAL=1
    export SWIFTUI_DISABLE_METAL=1
    export CA_USE_SOFTWARE_RENDERING=1
    export MTL_DEVICE_ALWAYS_SOFTWARE=1
    export METAL_DEBUG_ERROR_MODE=0
    export MTL_CAPTURE_ENABLED=0
    export MTL_DEBUG_LAYER=0
    export MTL_SHADER_VALIDATION=0
    export CA_DISABLE_METAL_LAYER=1
    export CA_FORCE_SOFTWARE_VSYNC=1
    export NSApp_DISABLE_METAL=1
    export NSView_FORCE_SOFTWARE_LAYER=1
    
    # Additional aggressive settings
    export SWIFTUI_USE_SOFTWARE_RENDERING=1
    export CA_CONTEXT_USE_SOFTWARE_RENDERING=1
    export COREGRAPHICS_USE_SOFTWARE_RENDERING=1
    
    # Ultra-aggressive Metal kernel blocking
    export MTL_HUD_ENABLED=0
    export MTL_SHADER_CACHE_ENABLE=0
    export MTL_DEVICE_FORCE_SOFTWARE=1
    export MTL_DISABLE_GPU_FAMILY_CHECK=1
    export METAL_DISABLE_CROSS_KERNEL=1
    export METAL_FORCE_SOFTWARE_KERNEL=1
    export METAL_NO_KERNELS=1
    export CA_CONTEXT_ALLOW_SOFTWARE_RENDERING=1
    export CA_FORCE_SOFTWARE_LAYER_BACKING=1
    export COREGRAPHICS_DISABLE_METAL=1
    
    echo "🔧 Applied environment variables:"
    echo "   METAL_DEVICE_WRAPPER_TYPE=$METAL_DEVICE_WRAPPER_TYPE"
    echo "   SWIFTUI_DISABLE_METAL=$SWIFTUI_DISABLE_METAL"
    echo "   CA_LAYER_DISABLE_METAL=$CA_LAYER_DISABLE_METAL"
    echo "   MTL_DEVICE_ALWAYS_SOFTWARE=$MTL_DEVICE_ALWAYS_SOFTWARE"
else
    echo "✅ Non-NVIDIA GPU detected - using standard launch"
fi

echo ""
echo "🏗️  Building app..."
xcodebuild -project AppStoreDiscovery-macOS.xcodeproj -scheme AppStoreDiscovery-macOS build > /dev/null 2>&1

if [[ $? -eq 0 ]]; then
    echo "✅ Build successful"
    echo ""
    echo "📱 Launching app with Metal protection..."
    echo "   🛡️  All Metal environment variables pre-set"
    echo "   🔍 Watch terminal for debug output"
    echo "   🖱️  Try clicking on apps - should NOT crash!"
    echo ""
    echo "=============================================================="
    
    # Launch the app with all environment variables already set
    APP_PATH=$(find /Users/imac/Library/Developer/Xcode/DerivedData/AppStoreDiscovery-macOS-*/Build/Products/Debug -name "AppStoreDiscovery-macOS.app" -type d 2>/dev/null | head -1)
    
    if [[ -n "$APP_PATH" ]]; then
        "$APP_PATH/Contents/MacOS/AppStoreDiscovery-macOS"
    else
        echo "❌ Could not find built app. Try building in Xcode first."
    fi
    
    echo ""
    echo "=============================================================="
    echo "App session complete."
else
    echo "❌ Build failed - check Xcode for errors"
fi 