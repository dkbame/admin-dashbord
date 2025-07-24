# 🔧 NVIDIA Metal Compatibility Fix

## Problem
If you're experiencing crashes with error messages like:
```
FAULT: NSInvalidArgumentException: -[NVMTLDevice supportsDynamicAttributeStride]: unrecognized selector sent to instance
```

This is a Metal compatibility issue with older NVIDIA graphics cards on Intel Macs.

## ✅ Automatic Solution (Recommended)

The app now **automatically detects** older NVIDIA cards and applies compatibility fixes! 

### What the app does automatically:
1. **Detects your graphics hardware** on startup
2. **Identifies problematic NVIDIA cards** (GTX 6xx, 7xx, 8xx, 9xx series, older Quadro, Tesla)
3. **Automatically switches to software rendering** if needed
4. **Shows rendering mode** in Settings → General → System Compatibility

### Check your rendering mode:
1. Open the app
2. Go to **Settings** (⌘+,)
3. Look at **System Compatibility** section
4. You'll see either:
   - ✅ **"Hardware"** (green) - Using GPU acceleration
   - ⚠️ **"Software"** (orange) - Using compatibility mode

## 🛠️ Manual Solutions

### Option 1: Use the Fix Script
```bash
cd /path/to/macOS
./fix-nvidia-metal.sh
```

### Option 2: Terminal Commands
```bash
# Set environment variables for software rendering
export METAL_DEVICE_WRAPPER_TYPE=1
export CA_LAYER_DISABLE_METAL=1
export METAL_DEBUG_ERROR_MODE=0

# Launch the app
open -a "AppStoreDiscovery-macOS"
```

### Option 3: Xcode Build Settings
The app is already configured with these build settings for Intel Macs:
```
OTHER_LDFLAGS[arch=x86_64] = "-Wl,-weak_reference_mismatches,weak"
METAL_ENABLE_DEBUG_INFO[arch=x86_64] = NO
```

## 🔍 Affected Hardware

### Known Problematic Cards:
- **NVIDIA GeForce 6xx, 7xx, 8xx, 9xx series**
- **NVIDIA Quadro K-series and older**
- **NVIDIA Tesla K-series and M-series**
- **Older integrated NVIDIA chipsets**

### Not Affected:
- **Apple Silicon Macs** (M1, M2, M3+) ✅
- **AMD graphics cards** ✅
- **Intel integrated graphics** ✅
- **Newer NVIDIA cards** (GTX 10xx+) ✅

## 📊 Performance Impact

| Rendering Mode | Performance | Compatibility | Recommended For |
|---------------|-------------|---------------|-----------------|
| **Hardware** | ⚡ Excellent | ⚠️ May crash on old NVIDIA | Modern graphics cards |
| **Software** | 🐌 Good | ✅ Universal compatibility | Older NVIDIA cards |

## 🆘 Troubleshooting

### Still getting crashes?
1. **Update macOS** to the latest version
2. **Update NVIDIA drivers** (if available)
3. **Force software rendering** using the manual methods above
4. **Check Console.app** for detailed error messages

### App runs but feels slow?
- This is normal when using software rendering
- Check Settings to confirm you're in "Software" mode
- Performance is still good for browsing apps and data

### Want to force hardware rendering?
Only if you have a newer NVIDIA card:
```bash
# Remove compatibility environment variables
unset METAL_DEVICE_WRAPPER_TYPE
unset CA_LAYER_DISABLE_METAL
unset METAL_DEBUG_ERROR_MODE

# Launch normally
open -a "AppStoreDiscovery-macOS"
```

## 💡 Technical Details

### Why does this happen?
- Older NVIDIA drivers don't support newer Metal API features
- SwiftUI tries to use `supportsDynamicAttributeStride` method
- Method doesn't exist in older NVIDIA Metal implementations
- Results in runtime crash with `unrecognized selector`

### How the fix works:
1. **Detection**: App checks Metal device name and capabilities
2. **Feature Testing**: Attempts to create Metal command queues
3. **Fallback**: Forces software rendering if Metal features fail
4. **Environment Variables**: Disables problematic Metal features

### Build-time vs Runtime:
- **Build settings**: Prevent some Metal issues during compilation
- **Runtime detection**: Handles device-specific compatibility
- **Environment variables**: Override Metal behavior per-session

## 🚀 Success Indicators

### App is working correctly when:
- ✅ No crash on startup
- ✅ UI renders properly
- ✅ Settings shows compatibility status
- ✅ Smooth navigation between views
- ✅ Images load correctly

### The fix is active when:
- 🔧 Console shows "MetalCompatibility" messages
- 🔧 Settings shows "Software" rendering mode
- 🔧 No Metal error messages in Console.app

---

## 📞 Still Need Help?

If none of these solutions work:

1. **Check your exact graphics card**:
   ```bash
   system_profiler SPDisplaysDataType
   ```

2. **Check macOS version**:
   ```bash
   sw_vers
   ```

3. **Run with detailed logging**:
   ```bash
   METAL_DEBUG_ERROR_MODE=1 open -a "AppStoreDiscovery-macOS"
   ```

The app is designed to work on **all Intel and Apple Silicon Macs**, including older systems with problematic graphics drivers. 