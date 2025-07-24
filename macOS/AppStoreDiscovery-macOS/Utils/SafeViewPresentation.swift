//
//  SafeViewPresentation.swift
//  AppStoreDiscovery-macOS
//
//  Safe view presentation that avoids Metal calls
//

import SwiftUI

/// Provides safe view presentation methods that avoid Metal issues
struct SafeViewPresentation {
    
    /// Safely present an app detail view
    static func presentAppDetail(for app: AppModel, completion: @escaping () -> Void) {
        // Apply immediate Metal compatibility if needed
        if MetalCompatibility.shared.shouldUseSoftwareRendering {
            applyImmediateCompatibility()
        }
        
        // Small delay to ensure environment variables are applied
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            completion()
        }
    }
    
    /// Apply immediate Metal compatibility settings
    static func applyImmediateCompatibility() {
        // Force immediate environment variable application
        setenv("METAL_DEVICE_WRAPPER_TYPE", "1", 1)
        setenv("CA_LAYER_DISABLE_METAL", "1", 1)
        setenv("SWIFTUI_DISABLE_METAL", "1", 1)
        setenv("CA_USE_SOFTWARE_RENDERING", "1", 1)
        setenv("MTL_DEVICE_ALWAYS_SOFTWARE", "1", 1)
        
        // Additional aggressive Metal kernel blocking
        setenv("METAL_FORCE_SOFTWARE_KERNEL", "1", 1)
        setenv("METAL_NO_KERNELS", "1", 1)
        setenv("MTL_DEVICE_FORCE_SOFTWARE", "1", 1)
        setenv("COREGRAPHICS_DISABLE_METAL", "1", 1)
        
        print("🔧 SafeViewPresentation: Applied immediate AGGRESSIVE Metal compatibility")
    }
}

/// Safe wrapper for sheet presentation
struct SafeSheet<SheetContent: View>: ViewModifier {
    @Binding var isPresented: Bool
    let sheetContent: () -> SheetContent
    
    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $isPresented) {
                Group {
                    self.sheetContent()
                }
                .onAppear {
                    // Ensure compatibility on sheet appearance
                    if MetalCompatibility.shared.shouldUseSoftwareRendering {
                        SafeViewPresentation.applyImmediateCompatibility()
                    }
                }
            }
    }
}

/// Safe wrapper for item-based sheet presentation
struct SafeItemSheet<Item: Identifiable, SheetContent: View>: ViewModifier {
    @Binding var item: Item?
    let sheetContent: (Item) -> SheetContent
    
    func body(content: Content) -> some View {
        content
            .sheet(item: $item) { item in
                Group {
                    self.sheetContent(item)
                }
                .onAppear {
                    // Ensure compatibility on sheet appearance
                    if MetalCompatibility.shared.shouldUseSoftwareRendering {
                        SafeViewPresentation.applyImmediateCompatibility()
                    }
                }
            }
    }
}

extension View {
    /// Present a sheet safely without Metal calls
    func safeSheet<SheetContent: View>(
        isPresented: Binding<Bool>,
        @ViewBuilder content: @escaping () -> SheetContent
    ) -> some View {
        modifier(SafeSheet(isPresented: isPresented, sheetContent: content))
    }
    
    /// Present an item-based sheet safely without Metal calls
    func safeSheet<Item: Identifiable, SheetContent: View>(
        item: Binding<Item?>,
        @ViewBuilder content: @escaping (Item) -> SheetContent
    ) -> some View {
        modifier(SafeItemSheet(item: item, sheetContent: content))
    }
} 