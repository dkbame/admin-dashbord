#!/bin/bash
# Fix for NVIDIA Metal issues on older Intel Macs
# Run this script if you encounter Metal errors with older NVIDIA graphics cards

echo "🔧 macOS App Discovery - NVIDIA Metal Fix"
echo "========================================="
echo ""

# Check if we're on an Intel Mac
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    echo "✅ Detected Intel Mac - applying NVIDIA Metal compatibility fixes"
    
    # Set environment variables for software rendering
    export METAL_DEVICE_WRAPPER_TYPE=1
    export METAL_DEBUG_ERROR_MODE=0
    export CA_LAYER_DISABLE_METAL=1
    export MTL_CAPTURE_ENABLED=0
    export MTL_DEBUG_LAYER=0
    
    echo "🔄 Applied environment variables for software rendering"
    echo ""
    echo "Environment variables set:"
    echo "  METAL_DEVICE_WRAPPER_TYPE=1"
    echo "  METAL_DEBUG_ERROR_MODE=0"
    echo "  CA_LAYER_DISABLE_METAL=1"
    echo "  MTL_CAPTURE_ENABLED=0"
    echo "  MTL_DEBUG_LAYER=0"
    echo ""
    
    # Launch the app with these settings
    echo "🚀 Launching macOS App Discovery with compatibility settings..."
    open -a "AppStoreDiscovery-macOS" --env METAL_DEVICE_WRAPPER_TYPE=1 --env CA_LAYER_DISABLE_METAL=1
    
elif [[ "$ARCH" == "arm64" ]]; then
    echo "ℹ️  Detected Apple Silicon Mac - Metal issues are rare on this platform"
    echo "   If you're still experiencing issues, please check for macOS updates"
    echo ""
    echo "🚀 Launching macOS App Discovery normally..."
    open -a "AppStoreDiscovery-macOS"
    
else
    echo "⚠️  Unknown architecture: $ARCH"
    echo "   Launching app normally..."
    open -a "AppStoreDiscovery-macOS"
fi

echo ""
echo "✅ Done! The app should now run without Metal errors."
echo ""
echo "💡 Tip: If you continue to have issues, you can also:"
echo "   1. Update your macOS to the latest version"
echo "   2. Check System Preferences > Displays for graphics settings"
echo "   3. Contact support if problems persist" 