//
//  MetalErrorHandler.swift
//  AppStoreDiscovery-macOS
//
//  Runtime Metal error handling for NVIDIA compatibility
//

import Foundation
import SwiftUI

class MetalErrorHandler {
    static let shared = MetalErrorHandler()
    
    private var hasAppliedEmergencyFix = false
    
    private init() {
        setupExceptionHandler()
    }
    
    private func setupExceptionHandler() {
        // Set up NSException handler for Metal errors
        NSSetUncaughtExceptionHandler { exception in
            MetalErrorHandler.shared.handleMetalException(exception)
        }
        
        // Set up signal handlers for crashes
        signal(SIGABRT) { signal in
            MetalErrorHandler.shared.handleMetalSignal(signal)
        }
        
        signal(SIGSEGV) { signal in
            MetalErrorHandler.shared.handleMetalSignal(signal)
        }
    }
    
    private func handleMetalException(_ exception: NSException) {
        let exceptionReason = exception.reason ?? ""
        let exceptionName = exception.name.rawValue
        
        print("🚨 MetalErrorHandler: Caught exception - \(exceptionName): \(exceptionReason)")
        
        // Check if this is a Metal-related exception
        if isMetalRelatedError(exceptionReason) || isMetalRelatedError(exceptionName) {
            applyEmergencyMetalFix()
        }
    }
    
    private func handleMetalSignal(_ signal: Int32) {
        print("🚨 MetalErrorHandler: Caught signal \(signal)")
        applyEmergencyMetalFix()
    }
    
    private func isMetalRelatedError(_ errorString: String) -> Bool {
        let metalErrorPatterns = [
            "supportsDynamicAttributeStride",
            "NVMTLDevice",
            "MTLDevice",
            "Metal",
            "GPU",
            "unrecognized selector",
            "NVIDIA",
            "NSInvalidArgumentException",
            "makeCommandQueue",
            "supportsFeatureSet",
            "GPUFamily",
            "CommandBuffer",
            "RenderPipeline"
        ]
        
        let lowercaseError = errorString.lowercased()
        return metalErrorPatterns.contains { pattern in
            lowercaseError.contains(pattern.lowercased())
        }
    }
    
    private func applyEmergencyMetalFix() {
        guard !hasAppliedEmergencyFix else { return }
        hasAppliedEmergencyFix = true
        
        print("🔧 MetalErrorHandler: Applying emergency Metal compatibility fix")
        
        // Force immediate software rendering
        MetalCompatibility.shared.forceImmediateSoftwareRendering()
        
        // Show user notification about compatibility mode
        DispatchQueue.main.async {
            self.showCompatibilityNotification()
        }
    }
    
    private func showCompatibilityNotification() {
        let alert = NSAlert()
        alert.messageText = "Graphics Compatibility Mode"
        alert.informativeText = "The app has automatically switched to software rendering for better compatibility with your graphics hardware. Performance remains excellent for browsing and discovering apps."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        
        if let window = NSApp.mainWindow {
            alert.beginSheetModal(for: window) { _ in }
        } else {
            alert.runModal()
        }
    }
    
    /// Check if we should proactively apply software rendering
    func checkAndApplyProactiveCompatibility() {
        if MetalCompatibility.shared.shouldUseSoftwareRendering && !hasAppliedEmergencyFix {
            print("🔧 MetalErrorHandler: Applying proactive Metal compatibility")
            MetalCompatibility.shared.applyCompatibilitySettings()
            hasAppliedEmergencyFix = true
        }
    }
} 