//
//  AppStoreDiscoveryApp.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

@main
struct AppStoreDiscoveryApp: App {
    
    init() {
        // CRITICAL: Apply Metal compatibility IMMEDIATELY before any UI/Metal calls
        print("🚀 AppStoreDiscoveryApp: Starting AGGRESSIVE Metal compatibility initialization")
        
        // IMMEDIATELY check and apply software rendering - no delays
        let shouldUseSoftware = MetalCompatibility.shared.shouldUseSoftwareRendering
        print("🔍 AppStoreDiscoveryApp: Should use software rendering: \(shouldUseSoftware)")
        
        if shouldUseSoftware {
            print("🔧 AppStoreDiscoveryApp: NVIDIA detected - applying IMMEDIATE comprehensive software rendering")
            
            // Apply ALL possible Metal-disabling environment variables IMMEDIATELY
            setenv("METAL_DEVICE_WRAPPER_TYPE", "1", 1)
            setenv("CA_LAYER_DISABLE_METAL", "1", 1)
            setenv("SWIFTUI_DISABLE_METAL", "1", 1)
            setenv("CA_USE_SOFTWARE_RENDERING", "1", 1)
            setenv("MTL_DEVICE_ALWAYS_SOFTWARE", "1", 1)
            setenv("METAL_DEBUG_ERROR_MODE", "0", 1)
            setenv("MTL_CAPTURE_ENABLED", "0", 1)
            setenv("MTL_DEBUG_LAYER", "0", 1)
            setenv("MTL_SHADER_VALIDATION", "0", 1)
            setenv("CA_DISABLE_METAL_LAYER", "1", 1)
            setenv("CA_FORCE_SOFTWARE_VSYNC", "1", 1)
            setenv("NSApp_DISABLE_METAL", "1", 1)
            setenv("NSView_FORCE_SOFTWARE_LAYER", "1", 1)
            
            // Additional aggressive Metal kernel blocking
            setenv("MTL_HUD_ENABLED", "0", 1)
            setenv("MTL_SHADER_CACHE_ENABLE", "0", 1)
            setenv("MTL_DEVICE_FORCE_SOFTWARE", "1", 1)
            setenv("MTL_DISABLE_GPU_FAMILY_CHECK", "1", 1)
            setenv("METAL_DISABLE_CROSS_KERNEL", "1", 1)
            setenv("METAL_FORCE_SOFTWARE_KERNEL", "1", 1)
            setenv("METAL_NO_KERNELS", "1", 1)
            
            // Core Animation software-only flags
            setenv("CA_CONTEXT_ALLOW_SOFTWARE_RENDERING", "1", 1)
            setenv("CA_FORCE_SOFTWARE_LAYER_BACKING", "1", 1)
            setenv("COREGRAPHICS_DISABLE_METAL", "1", 1)
            
            print("🛡️ AppStoreDiscoveryApp: Applied ALL Metal-disabling environment variables")
            
            MetalCompatibility.shared.forceImmediateSoftwareRendering()
        }
        
        // Initialize Metal error handling
        _ = MetalErrorHandler.shared
        
        // Apply all compatibility settings (redundant but safe)
        MetalCompatibility.shared.applyCompatibilitySettings()
        
        // Check and apply proactive compatibility
        MetalErrorHandler.shared.checkAndApplyProactiveCompatibility()
        
        print("✅ AppStoreDiscoveryApp: AGGRESSIVE Metal compatibility initialization complete")
        print("🔧 Current environment variables:")
        if let metalWrapper = getenv("METAL_DEVICE_WRAPPER_TYPE") {
            print("   METAL_DEVICE_WRAPPER_TYPE = \(String(cString: metalWrapper))")
        }
        if let swiftuiMetal = getenv("SWIFTUI_DISABLE_METAL") {
            print("   SWIFTUI_DISABLE_METAL = \(String(cString: swiftuiMetal))")
        }
        if let caLayerMetal = getenv("CA_LAYER_DISABLE_METAL") {
            print("   CA_LAYER_DISABLE_METAL = \(String(cString: caLayerMetal))")
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        
        // Settings window
        Settings {
            SettingsView()
        }
    }
} 