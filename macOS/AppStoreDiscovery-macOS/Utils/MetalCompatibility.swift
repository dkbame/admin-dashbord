//
//  MetalCompatibility.swift
//  AppStoreDiscovery-macOS
//
//  Metal compatibility helper for older NVIDIA cards
//

import Foundation
import Metal

class MetalCompatibility {
    static let shared = MetalCompatibility()
    
    private var _isMetalCompatible: Bool?
    private var _shouldUseSoftwareRendering: Bool?
    
    private init() {}
    
    /// Check if the current device supports our Metal requirements
    var isMetalCompatible: Bool {
        if let cached = _isMetalCompatible {
            return cached
        }
        
        let result = checkMetalCompatibility()
        _isMetalCompatible = result
        return result
    }
    
    /// Whether we should force software rendering for compatibility
    var shouldUseSoftwareRendering: Bool {
        if let cached = _shouldUseSoftwareRendering {
            return cached
        }
        
        let result = checkForOldNvidiaCard()
        _shouldUseSoftwareRendering = result
        return result
    }
    
    private func checkMetalCompatibility() -> Bool {
        // Don't try to create Metal device - this causes the crash!
        // Use system info instead
        let gpuInfo = getGPUInfo()
        print("🔍 MetalCompatibility: Detected graphics device: \(gpuInfo)")
        
        // Check if it's a problematic NVIDIA card
        let isProblematicNVIDIA = gpuInfo.lowercased().contains("nvidia") && (
            gpuInfo.lowercased().contains("geforce") ||
            gpuInfo.lowercased().contains("gtx") ||
            gpuInfo.lowercased().contains("gt ") ||
            gpuInfo.lowercased().contains("quadro")
        )
        
        if isProblematicNVIDIA {
            print("⚠️ MetalCompatibility: Detected problematic NVIDIA card - using software rendering")
            return false
        }
        
        // For now, assume Metal is compatible for non-problematic cards
        return true
    }
    
    /// Get GPU information using system calls instead of Metal
    private func getGPUInfo() -> String {
        let task = Process()
        task.launchPath = "/usr/sbin/system_profiler"
        task.arguments = ["SPDisplaysDataType"]
        
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe
        
        do {
            try task.run()
            task.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            
            // Parse the GPU name from system_profiler output
            let lines = output.components(separatedBy: .newlines)
            for line in lines {
                if line.contains("Chipset Model:") || line.contains("Graphics:") {
                    let parts = line.components(separatedBy: ":")
                    if parts.count > 1 {
                        let gpuName = parts[1].trimmingCharacters(in: .whitespaces)
                        if !gpuName.isEmpty {
                            return gpuName
                        }
                    }
                }
            }
        } catch {
            print("⚠️ Failed to get GPU info: \(error)")
        }
        
        // Fallback to a generic identifier
        return "Unknown GPU"
    }
    
    private func checkForOldNvidiaCard() -> Bool {
        // Use safe system info instead of Metal device creation
        let gpuInfo = getGPUInfo()
        let deviceName = gpuInfo.lowercased()
        
        print("🔍 MetalCompatibility: Checking GPU for NVIDIA compatibility: \(gpuInfo)")
        
        // Check if it's any NVIDIA card first
        let isNvidiaCard = deviceName.contains("nvidia") || 
                          deviceName.contains("geforce") || 
                          deviceName.contains("quadro") ||
                          deviceName.contains("tesla")
        
        if !isNvidiaCard {
            print("✅ MetalCompatibility: Non-NVIDIA GPU detected, using hardware rendering")
            return false
        }
        
        // For NVIDIA cards, be conservative and use software rendering
        // This is safer than trying to detect specific problematic models
        print("⚠️ MetalCompatibility: NVIDIA GPU detected, using software rendering for compatibility: \(gpuInfo)")
        return true
    }
    
    /// Apply compatibility settings for the current system
    func applyCompatibilitySettings() {
        if shouldUseSoftwareRendering {
            print("🔄 MetalCompatibility: Applying comprehensive software rendering compatibility settings")
            
            // Core Metal software rendering
            setenv("METAL_DEVICE_WRAPPER_TYPE", "1", 1) // Force software rendering
            setenv("METAL_DEBUG_ERROR_MODE", "0", 1)    // Disable Metal debugging
            setenv("CA_LAYER_DISABLE_METAL", "1", 1)    // Disable Metal for Core Animation
            
            // Additional Metal compatibility flags
            setenv("MTL_CAPTURE_ENABLED", "0", 1)
            setenv("MTL_DEBUG_LAYER", "0", 1)
            setenv("MTL_SHADER_VALIDATION", "0", 1)
            setenv("MTL_DEVICE_ALWAYS_SOFTWARE", "1", 1)
            
            // SwiftUI Metal compatibility
            setenv("SWIFTUI_DISABLE_METAL", "1", 1)
            setenv("SWIFTUI_USE_SOFTWARE_RENDERING", "1", 1)
            
            // Core Animation software fallback
            setenv("CA_USE_SOFTWARE_RENDERING", "1", 1)
            setenv("CA_DISABLE_METAL_LAYER", "1", 1)
            setenv("CA_FORCE_SOFTWARE_VSYNC", "1", 1)
            
            // AppKit/Cocoa compatibility
            setenv("NSApp_DISABLE_METAL", "1", 1)
            setenv("NSView_FORCE_SOFTWARE_LAYER", "1", 1)
            
            print("🔧 Applied comprehensive Metal compatibility environment variables")
        } else {
            print("✅ MetalCompatibility: Using hardware acceleration")
        }
    }
    
    /// Force immediate software rendering for problematic devices
    func forceImmediateSoftwareRendering() {
        print("⚠️ MetalCompatibility: Forcing immediate software rendering due to runtime Metal error")
        
        // Apply all software rendering flags immediately
        setenv("METAL_DEVICE_WRAPPER_TYPE", "1", 1)
        setenv("CA_LAYER_DISABLE_METAL", "1", 1)
        setenv("SWIFTUI_DISABLE_METAL", "1", 1)
        setenv("CA_USE_SOFTWARE_RENDERING", "1", 1)
        setenv("MTL_DEVICE_ALWAYS_SOFTWARE", "1", 1)
        
        // Update cached values
        _shouldUseSoftwareRendering = true
        _isMetalCompatible = false
    }
} 