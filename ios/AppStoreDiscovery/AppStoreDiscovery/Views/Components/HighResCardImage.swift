//
//  HighResCardImage.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - High Resolution Card Image with Performance Optimization
struct HighResCardImage: View {
    let url: String
    let size: CGSize
    @State private var lowResImage: UIImage?
    @State private var highResImage: UIImage?
    @State private var isLoading = true
    @State private var loadTask: Task<Void, Never>?
    
    var body: some View {
        ZStack {
            // Background placeholder
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.gray.opacity(0.3),
                            Color.gray.opacity(0.1)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            // Low-res image (instant display)
            if let lowRes = lowResImage {
                Image(uiImage: lowRes)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size.width, height: size.height)
                    .clipped()
                    .cornerRadius(16)
                    .blur(radius: 0.3) // Slight blur for smooth transition
            }
            
            // High-res image (fades in when ready)
            if let highRes = highResImage {
                Image(uiImage: highRes)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size.width, height: size.height)
                    .clipped()
                    .cornerRadius(16)
                    .transition(.opacity.animation(.easeInOut(duration: 0.4)))
            }
            
            // Loading shimmer
            if isLoading {
                ShimmerView()
                    .cornerRadius(16)
            }
        }
        .frame(width: size.width, height: size.height)
        .onAppear {
            loadImage()
        }
        .onDisappear {
            loadTask?.cancel()
        }
    }
    
    private func loadImage() {
        print("[DEBUG] 🖼️ HighResCardImage: loadImage() called for URL: \(url)")
        
        guard let imageURL = URL(string: url) else { 
            print("[DEBUG] ❌ HighResCardImage: Invalid URL: \(url)")
            return 
        }
        
        print("[DEBUG] 🖼️ HighResCardImage: Valid URL created: \(imageURL)")
        
        // Check cache first
        if let cachedImage = ImageCache.shared.getImage(for: url) {
            print("[DEBUG] ✅ HighResCardImage: Found cached image for: \(url)")
            self.highResImage = cachedImage
            self.isLoading = false
            return
        }
        
        print("[DEBUG] 📱 HighResCardImage: No cached image, starting download...")
        
        loadTask = Task {
            // Load low-res first (for instant display)
            await loadLowResImage(from: imageURL)
            
            // Load high-res in background
            await loadHighResImage(from: imageURL)
        }
    }
    
    private func loadLowResImage(from url: URL) async {
        print("[DEBUG] 📱 HighResCardImage: Loading low-res image from: \(url)")
        // Create a smaller version for instant display
        let lowResSize = CGSize(width: size.width * 0.3, height: size.height * 0.3)
        
        do {
            print("[DEBUG] 📱 HighResCardImage: Starting URLSession download...")
            let (data, response) = try await URLSession.shared.data(from: url)
            print("[DEBUG] 📱 HighResCardImage: Download completed, data size: \(data.count) bytes")
            
            if let httpResponse = response as? HTTPURLResponse {
                print("[DEBUG] 📱 HighResCardImage: HTTP status: \(httpResponse.statusCode)")
            }
            
            if let image = UIImage(data: data) {
                print("[DEBUG] 📱 HighResCardImage: Successfully created UIImage from data")
                let resizedImage = await resizeImage(image, to: lowResSize)
                
                await MainActor.run {
                    self.lowResImage = resizedImage
                    print("[DEBUG] 📱 HighResCardImage: Low-res image set successfully")
                }
            } else {
                print("[DEBUG] ❌ HighResCardImage: Failed to create UIImage from data")
            }
        } catch {
            print("[DEBUG] ❌ HighResCardImage: Failed to load low-res image: \(error)")
        }
    }
    
    private func loadHighResImage(from url: URL) async {
        print("[DEBUG] 🖼️ HighResCardImage: Loading high-res image from: \(url)")
        do {
            print("[DEBUG] 🖼️ HighResCardImage: Starting URLSession download for high-res...")
            let (data, response) = try await URLSession.shared.data(from: url)
            print("[DEBUG] 🖼️ HighResCardImage: High-res download completed, data size: \(data.count) bytes")
            
            if let httpResponse = response as? HTTPURLResponse {
                print("[DEBUG] 🖼️ HighResCardImage: HTTP status: \(httpResponse.statusCode)")
            }
            
            if let image = UIImage(data: data) {
                print("[DEBUG] 🖼️ HighResCardImage: Successfully created high-res UIImage")
                let resizedImage = await resizeImage(image, to: size)
                
                await MainActor.run {
                    self.highResImage = resizedImage
                    self.isLoading = false
                    print("[DEBUG] 🖼️ HighResCardImage: High-res image set successfully, loading complete")
                    
                    // Cache the high-res image
                    ImageCache.shared.setImage(resizedImage, for: url.absoluteString)
                    print("[DEBUG] 🖼️ HighResCardImage: High-res image cached successfully")
                }
            } else {
                print("[DEBUG] ❌ HighResCardImage: Failed to create high-res UIImage from data")
                await MainActor.run {
                    self.isLoading = false
                }
            }
        } catch {
            print("[DEBUG] ❌ HighResCardImage: Failed to load high-res image: \(error)")
            await MainActor.run {
                self.isLoading = false
            }
        }
    }
    
    private func resizeImage(_ image: UIImage, to size: CGSize) async -> UIImage {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let renderer = UIGraphicsImageRenderer(size: size)
                let resizedImage = renderer.image { context in
                    image.draw(in: CGRect(origin: .zero, size: size))
                }
                continuation.resume(returning: resizedImage)
            }
        }
    }
}

#Preview {
    HighResCardImage(
        url: "https://example.com/sample-image.jpg",
        size: CGSize(width: 280, height: 160)
    )
    .frame(width: 280, height: 160)
    .padding()
} 