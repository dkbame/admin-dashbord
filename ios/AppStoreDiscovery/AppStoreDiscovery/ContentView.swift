//
//  ContentView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Image Cache Manager
class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    init() {
        cache.countLimit = 10 // Limit memory usage
        cache.totalCostLimit = 50 * 1241024 // MB limit
        
        // Create cache directory
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("ImageCache")
        
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    func getImage(for url: String) -> UIImage? { // Check memory cache first
        if let cachedImage = cache.object(forKey: url as NSString) {
            return cachedImage
        }
        
        // Check disk cache
        let fileName = url.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? url
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        
        if let data = try? Data(contentsOf: fileURL), let image = UIImage(data: data) {
            // Store in memory cache
            cache.setObject(image, forKey: url as NSString)
            return image
        }
        
        return nil
    }
    
    func setImage(_ image: UIImage, for url: String) { // Store in memory cache
        cache.setObject(image, forKey: url as NSString)
        
        // Store in disk cache
        let fileName = url.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? url
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
        }
    }
    
    func clearCache() {
        cache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

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
        guard let imageURL = URL(string: url) else { return }
        
        // Check cache first
        if let cachedImage = ImageCache.shared.getImage(for: url) {
            self.highResImage = cachedImage
            self.isLoading = false
            return
        }
        
        loadTask = Task {
            // Load low-res first (for instant display)
            await loadLowResImage(from: imageURL)
            
            // Load high-res in background
            await loadHighResImage(from: imageURL)
        }
    }
    
    private func loadLowResImage(from url: URL) async {
        // Create a smaller version for instant display
        let lowResSize = CGSize(width: size.width * 0.3, height: size.height * 0.3)
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let image = UIImage(data: data) {
                let resizedImage = await resizeImage(image, to: lowResSize)
                
                await MainActor.run {
                    self.lowResImage = resizedImage
                }
            }
        } catch {
            print("Failed to load low-res image: \(error)")
        }
    }
    
    private func loadHighResImage(from url: URL) async {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let image = UIImage(data: data) {
                let resizedImage = await resizeImage(image, to: size)
                
                await MainActor.run {
                    self.highResImage = resizedImage
                    self.isLoading = false
                    
                    // Cache the high-res image
                    ImageCache.shared.setImage(resizedImage, for: url.absoluteString)
                }
            }
        } catch {
            print("Failed to load high-res image: \(error)")
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

// MARK: - Shimmer Loading Effect
struct ShimmerView: View {
    @State private var isAnimating = false
    
    var body: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color.gray.opacity(0.3),
                Color.gray.opacity(0.1),
                Color.gray.opacity(0.3)
            ]),
            startPoint: isAnimating ? .leading : .trailing,
            endPoint: isAnimating ? .trailing : .leading
        )
        .onAppear {
            withAnimation(Animation.linear(duration: 1.0).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

// MARK: - Content View
struct ContentView: View {
    @StateObject private var apiService = APIService()
    
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
            
            CategoriesView(apiService: apiService)
                .tabItem {
                    Image(systemName: "square.grid.2x2.fill")
                    Text("Categories")
                }
            
            SearchView(apiService: apiService)
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Search")
                }
            
            FavoritesView(apiService: apiService)
                .tabItem {
                    Image(systemName: "heart.fill")
                    Text("Favorites")
                }
        }
        .accentColor(.blue)
        .onAppear {
            // Initialize data when app launches
            Task {
                await apiService.fetchApps()
                await apiService.fetchCategories()
            }
        }
    }
}

// MARK: - App Section View
struct AppSectionView: View {
    let title: String
    let apps: [AppModel]
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                    .font(.title2)
                
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                NavigationLink("See All", destination: Text("See All \(title)"))
                    .font(.subheadline)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
            
            // Horizontal App List
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps) { app in
                        HorizontalAppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Horizontal App Card
struct HorizontalAppCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 12) {
                // App Icon
                if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.gray.opacity(0.2))
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(width: 80, height: 80)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Image(systemName: "app.badge")
                                .foregroundColor(.gray)
                        )
                        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
                }
                
                // App Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .frame(width: 80)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        if let rating = app.rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                    .font(.caption2)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        if let price = app.price {
                            Text(price == "0" ? "Free" : "$\(price)")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    price == "0" 
                                        ? Color.green.opacity(0.2)
                                        : Color.blue.opacity(0.2)
                                )
                                .foregroundColor(price == "0" ? .green : .blue)
                                .cornerRadius(6)
                        }
                    }
                }
            }
            .frame(width: 80)
        }
        .buttonStyle(PlainButtonStyle())
    }
} 