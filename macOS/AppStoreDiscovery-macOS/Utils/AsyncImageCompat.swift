//
//  AsyncImageCompat.swift
//  AppStoreDiscovery-macOS
//
//  Compatibility wrapper for AsyncImage to support macOS 11.0+
//

import SwiftUI
import Combine

// MARK: - macOS 11.0 Compatible AsyncImage
struct AsyncImageCompat<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder
    
    @State private var image: Image?
    @State private var isLoading = false
    
    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }
    
    var body: some View {
        Group {
            if let image = image {
                content(image)
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
    }
    
    private func loadImage() {
        guard let url = url, !isLoading else { return }
        
        isLoading = true
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                isLoading = false
                
                if let data = data,
                   let nsImage = NSImage(data: data) {
                    // Create image with software rendering hint if needed
                    if MetalCompatibility.shared.shouldUseSoftwareRendering {
                        // Force software rendering for NSImage
                        nsImage.cacheMode = .never
                        nsImage.matchesOnlyOnBestFittingAxis = true
                        
                        // Create software-only image representation
                        if let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: [
                            .interpolation: NSImageInterpolation.none.rawValue,
                            .ctm: NSAffineTransform()
                        ]) {
                            // Force software rendering by avoiding Metal-accelerated paths
                            let softwareImage = NSImage(cgImage: cgImage, size: nsImage.size)
                            softwareImage.cacheMode = .never
                            self.image = Image(nsImage: softwareImage)
                            print("🖼️ AsyncImageCompat: Created software-rendered image")
                        } else {
                            self.image = Image(nsImage: nsImage)
                        }
                    } else {
                        self.image = Image(nsImage: nsImage)
                    }
                }
            }
        }.resume()
    }
}

// MARK: - Convenience Extensions
extension AsyncImageCompat where Content == Image, Placeholder == Color {
    init(url: URL?) {
        self.init(
            url: url,
            content: { $0 },
            placeholder: { Color.gray.opacity(0.3) }
        )
    }
}

extension AsyncImageCompat where Placeholder == Color {
    init(url: URL?, @ViewBuilder content: @escaping (Image) -> Content) {
        self.init(
            url: url,
            content: content,
            placeholder: { Color.gray.opacity(0.3) }
        )
    }
} 