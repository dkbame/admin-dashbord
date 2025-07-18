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

// MARK: - Category Bar Component
struct CategoryBar: View {
    let categories: [Category]
    let onCategoryTap: (Category) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section Header
            HStack {
                Text("Categories")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                NavigationLink("See All", destination: CategoriesView())
                    .font(.subheadline)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
            
            // Horizontal Scrollable Categories
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(categories) { category in
                        CategoryButton(
                            category: category,
                            onTap: { onCategoryTap(category) }
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let category: Category
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            Text(category.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(.systemGray6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color(.systemGray4), lineWidth: 0.5)
                        )
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}



// MARK: - Featured Apps View with Horizontal Scroll
struct FeaturedAppsView: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing:16) {
            // Section Header
            HStack {
                Image(systemName: "star.circle.fill")
                    .foregroundColor(.orange)
                    .font(.title2)
                
                Text("Featured Apps")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                NavigationLink("See All", destination: Text("See All Featured Apps"))
                    .font(.subheadline)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
            
            // Horizontal Scroll with Large Cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps) { app in
                        FeaturedAppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Featured App Card
struct FeaturedAppCard: View {
    let app: AppModel
    
    private let cardSize = CGSize(width: 280, height: 200)
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            ZStack {
                // Screenshot Background
                if let screenshots = app.screenshots, !screenshots.isEmpty {
                    HighResCardImage(
                        url: screenshots[0].url,
                        size: cardSize
                    )
                } else {
                    // Fallback gradient background
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.blue.opacity(0.3),
                                    Color.purple.opacity(0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: cardSize.width, height: cardSize.height)
                }
                
                // Dark gradient overlay for text readability
                LinearGradient(
                    colors: [
                        Color.black.opacity(0.3),
                        Color.black.opacity(0.1),
                        Color.black.opacity(0.5)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .cornerRadius(16)
                
                // Content Overlay
                VStack(alignment: .leading, spacing: 12) {
                    // App Icon and Info
                    HStack(alignment: .top, spacing: 12) {
                        // App Icon
                        if let iconUrl = app.icon_url {
                            AsyncImage(url: URL(string: iconUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.gray.opacity(0.3))
                                    .overlay(
                                        Image(systemName: "app.badge")
                                            .foregroundColor(.white)
                                            .font(.system(size: 20))
                                    )
                            }
                            .frame(width: 60, height: 60)
                            .cornerRadius(12)
                            .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                        } else {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: 60, height: 60)
                                .overlay(
                                    Image(systemName: "app.badge")
                                        .foregroundColor(.white)
                                        .font(.system(size: 20))
                                )
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                        }
                        
                        // App Info
                        VStack(alignment: .leading, spacing: 4) {
                            Text(app.name)
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                                .lineLimit(2)
                            
                            if let developer = app.developer {
                                Text(developer)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.9))
                                    .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                                    .lineLimit(1)
                            }
                            
                            // Rating if available
                            if let rating = app.rating, rating > 0 {
                                HStack(spacing: 4) {
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                        .font(.caption)
                                    
                                    Text(String(format: "%.1f", rating))
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.9))
                                        .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                                }
                            }
                        }
                        
                        Spacer()
                    }
                    
                    Spacer()
                }
                .padding(16)
            }
            .frame(width: cardSize.width, height: cardSize.height)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Content View
struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
            
            CategoriesView()
                .tabItem {
                    Image(systemName: "square.grid.2x2.fill")
                    Text("Categories")
                }
            
            SearchView()
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Search")
                }
            
            FavoritesView()
                .tabItem {
                    Image(systemName: "heart.fill")
                    Text("Favorites")
                }
        }
        .accentColor(.blue)
    }
}

struct HomeView: View {
    @StateObject private var apiService = APIService()
    
    // Featured apps (top 5 apps or apps marked as featured)
    var featuredApps: [AppModel] {
        let apps = apiService.apps
        let featured = apps.filter { $0.is_featured == true }
        return featured.isEmpty ? Array(apps.prefix(5)) : featured
    }
    
    // Recently added apps (last 10 apps)
    var recentlyAddedApps: [AppModel] {
        Array(apiService.apps.prefix(10))
    }
    
    // Top rated apps (sorted by rating)
    var topRatedApps: [AppModel] {
        apiService.apps
            .filter { $0.rating != nil && $0.rating! > 0 }
            .sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
            .prefix(10)
            .map { $0 }
    }
    
    // Free apps
    var freeApps: [AppModel] {
        apiService.apps.filter { $0.is_free == true }.prefix(10).map { $0 }
    }
    
    // New computed properties for additional sections
    var trendingApps: [AppModel] {
        apiService.apps
            .filter { $0.rating_count != nil && $0.rating_count! > 100 }
            .sorted { ($0.rating_count ?? 0) > ($1.rating_count ?? 0) }
            .prefix(10)
            .map { $0 }
    }
    
    var newReleases: [AppModel] {
        apiService.apps
            .filter { $0.release_date != nil }
            .sorted { 
                let date1 = ISO8601DateFormatter().date(from: $0.release_date!) ?? Date.distantPast
                let date2 = ISO8601DateFormatter().date(from: $1.release_date!) ?? Date.distantPast
                return date1 > date2
            }
            .prefix(10)
            .map { $0 }
    }
    
    var premiumApps: [AppModel] {
        apiService.apps
            .filter { $0.is_free == false && $0.price != nil && $0.price != "0" }
            .prefix(10)
            .map { $0 }
    }
    
    var body: some View {
        NavigationView {
            Group {
                if apiService.isLoading {
                    VStack {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading apps...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = apiService.errorMessage {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Error")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text(error)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if apiService.apps.isEmpty {
                    VStack {
                        Image(systemName: "app.badge")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No apps found")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Check back later for new apps")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Categories Section
                            if !apiService.categories.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    // Section Header
                                    HStack {
                                        Text("Categories")
                                            .font(.title2)
                                            .fontWeight(.bold)
                                        
                                        Spacer()
                                        
                                        NavigationLink("See All", destination: CategoriesView())
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                    .padding(.horizontal)
                                    
                                    // Horizontal Scrollable Categories
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 12) {
                                            ForEach(apiService.categories) { category in
                                                NavigationLink(destination: CategoryDetailView(category: category)) {
                                                    Text(category.name)
                                                        .font(.subheadline)
                                                        .fontWeight(.medium)
                                                        .foregroundColor(.primary)
                                                        .padding(.horizontal, 16)
                                                        .padding(.vertical, 8)
                                                        .background(
                                                            RoundedRectangle(cornerRadius: 20)
                                                                .fill(Color(.systemGray6))
                                                                .overlay(
                                                                    RoundedRectangle(cornerRadius: 20)
                                                                        .stroke(Color(.systemGray4), lineWidth: 0.5)
                                                                )
                                                        )
                                                }
                                                .buttonStyle(PlainButtonStyle())
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                            }
                            
                            // Featured Apps Section
                            if !featuredApps.isEmpty {
                                FeaturedAppsView(apps: featuredApps)
                            }
                            
                            // New Releases Section
                            if !newReleases.isEmpty {
                                AppSectionView(
                                    title: "New Releases",
                                    apps: newReleases,
                                    icon: "sparkles"
                                )
                            }
                            
                            // Trending Apps Section
                            if !trendingApps.isEmpty {
                                AppSectionView(
                                    title: "Trending Now",
                                    apps: trendingApps,
                                    icon: "chart.line.uptrend.xyaxis"
                                )
                            }
                            
                            // Recently Added Section
                            if !recentlyAddedApps.isEmpty {
                                AppSectionView(
                                    title: "Recently Added",
                                    apps: recentlyAddedApps,
                                    icon: "clock.fill"
                                )
                            }
                            
                            // Top Rated Section
                            if !topRatedApps.isEmpty {
                                AppSectionView(
                                    title: "Top Rated",
                                    apps: topRatedApps,
                                    icon: "star.fill"
                                )
                            }
                            
                            // Premium Apps Section
                            if !premiumApps.isEmpty {
                                AppSectionView(
                                    title: "Premium Apps",
                                    apps: premiumApps,
                                    icon: "crown.fill"
                                )
                            }
                            
                            // Free Apps Section
                            if !freeApps.isEmpty {
                                AppSectionView(
                                    title: "Free Apps",
                                    apps: freeApps,
                                    icon: "gift.fill"
                                )
                            }
                        }
                        .padding(.top, 20)
                    }
                }
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await apiService.fetchApps()
            }
            .onAppear {
                Task {
                    await apiService.fetchApps()
                    await apiService.fetchCategories()
                }
                // Start real-time subscriptions
                apiService.subscribeToRealTimeUpdates()
            }
            .onDisappear {
                // Clean up real-time subscriptions
                apiService.unsubscribeFromRealTimeUpdates()
            }
        }
    }
}

// App Section View
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

// Horizontal App Card
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

struct CategoriesSection: View {
    let categories: [Category]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Categories")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(categories.prefix(6)) { category in
                    CategoryCard(category: category)
                }
            }
            .padding(.horizontal)
        }
    }
}

struct AppsSection: View {
    let title: String
    let subtitle: String
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                NavigationLink(destination: AppsListView(title: title, apps: apps)) {
                    Text("See All")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps.prefix(10)) { app in
                        AppStoreAppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

struct AppStoreAppCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 8) {
                // App Icon
                if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.gray.opacity(0.2))
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(width: 60, height: 60)
                    .cornerRadius(12)
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Image(systemName: "app.badge")
                                .foregroundColor(.gray)
                        )
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(app.name)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack {
                        if let rating = app.rating {
                            HStack(spacing: 1) {
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
                                .foregroundColor(price == "0" ? .green : .blue)
                        }
                    }
                }
            }
            .frame(width: 100)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct AppsListView: View {
    let title: String
    let apps: [AppModel]
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(apps) { app in
                    AppCard(app: app)
                }
            }
            .padding()
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
    }
}

struct AppCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    // App Icon
                    if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.2))
                                .overlay(
                                    Image(systemName: "app.badge")
                                        .foregroundColor(.gray)
                                )
                        }
                        .frame(width: 60, height: 60)
                        .cornerRadius(12)
                    } else {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 60, height: 60)
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                            )
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(app.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(2)
                        
                        if let developer = app.developer {
                            Text(developer)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            if let rating = app.rating {
                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                        .font(.caption)
                                    Text(String(format: "%.1f", rating))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            if let price = app.price {
                                Text(price == "0" ? "Free" : "$\(price)")
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(price == "0" ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                                    .foregroundColor(price == "0" ? .green : .blue)
                                    .cornerRadius(4)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    if app.is_featured == true {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                    }
                }
                
                // App Description
                Text(app.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                
                // Screenshots
                if let screenshots = app.screenshots, !screenshots.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(screenshots.prefix(3)) { screenshot in
                                if let url = URL(string: screenshot.url) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color.gray.opacity(0.2))
                                    }
                                    .frame(width: 120, height: 80)
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct AppGridCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 12) {
                // App Icon - Enhanced design
                if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .overlay(
                                Image(systemName: "app.badge")
                                    .font(.system(size: 30))
                                    .foregroundColor(.white)
                            )
                    }
                    .frame(width: 90, height: 90)
                    .cornerRadius(20)
                    .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                } else {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 90, height: 90)
                        .overlay(
                            Image(systemName: "app.badge")
                                .font(.system(size: 30))
                                .foregroundColor(.white)
                        )
                        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text(app.name)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack {
                        if let rating = app.rating {
                            HStack(spacing: 3) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                    .font(.caption)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        if let price = app.price {
                            Text(price == "0" ? "Free" : "$\(price)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(
                                    price == "0" 
                                        ? LinearGradient(colors: [Color.green.opacity(0.2), Color.green.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                                        : LinearGradient(colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                                )
                                .foregroundColor(price == "0" ? .green : .blue)
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 6)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct CategoriesView: View {
    @StateObject private var apiService = APIService()
    
    var body: some View {
        NavigationView {
            Group {
                if apiService.isLoading {
                    VStack {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading categories...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = apiService.errorMessage {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Error")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text(error)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(apiService.categories) { category in
                                CategoryCard(category: category)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Categories")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await apiService.fetchCategories()
            }
            .onAppear {
                Task {
                    await apiService.fetchCategories()
                }
            }
        }
    }
}

struct CategoryCard: View {
    let category: Category
    
    var body: some View {
        NavigationLink(destination: CategoryDetailView(category: category)) {
            VStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.blue.opacity(0.1))
                    .frame(height: 120)
                    .overlay(
                        VStack {
                            Image(systemName: "folder.fill")
                                .font(.system(size: 30))
                                .foregroundColor(.blue)
                            Text(category.name)
                                .font(.headline)
                                .foregroundColor(.primary)
                                .multilineTextAlignment(.center)
                        }
                    )
            }
            .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SearchView: View {
    @StateObject private var apiService = APIService()
    @State private var searchText = ""
    @State private var searchResults: [AppModel] = []
    @State private var searchHistory: [String] = []
    @State private var isSearching = false
    @State private var showSuggestions = false
    
    // Popular search terms for suggestions
    private let popularSearches = ["Productivity", "Games", "Photo", "Music", "Social", "Utility", "Education", "Entertainment"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Enhanced Search Bar
                EnhancedSearchBar(
                    text: $searchText,
                    isSearching: $isSearching,
                    showSuggestions: $showSuggestions,
                    onSearch: performSearch,
                    onClear: clearSearch
                )
                
                if searchText.isEmpty {
                    // Empty State with Suggestions
                    ScrollView {
                        VStack(spacing: 24) {
                            // Search History
                            if !searchHistory.isEmpty {
                                SearchHistorySection(
                                    history: searchHistory,
                                    onTapHistory: { term in
                                        searchText = term
                                        performSearch()
                                    },
                                    onClearHistory: clearSearchHistory
                                )
                            }
                            
                            // Popular Searches
                            PopularSearchesSection(
                                searches: popularSearches,
                                onTapSearch: { term in
                                    searchText = term
                                    performSearch()
                                }
                            )
                            
                            // Recent Apps
                            RecentAppsSection(apps: Array(apiService.apps.prefix(6)))
                        }
                        .padding()
                    }
                } else if isSearching {
                    // Loading State
                    VStack {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Searching...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if searchResults.isEmpty {
                    // No Results State
                    VStack(spacing: 16) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No results found")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Try different keywords or check your spelling")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        // Suggestions for no results
                        if !searchText.isEmpty {
                            VStack(spacing: 8) {
                                Text("Suggestions:")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                
                                ForEach(generateSuggestions(), id: \.self) { suggestion in
                                    Button(action: {
                                        searchText = suggestion
                                        performSearch()
                                    }) {
                                        Text(suggestion)
                                            .foregroundColor(.blue)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.blue.opacity(0.1))
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            .padding(.top)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    // Search Results
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            // Results Header
                            HStack {
                                Text("\(searchResults.count) result\(searchResults.count == 1 ? "" : "s")")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            .padding(.horizontal)
                            
                            ForEach(searchResults) { app in
                                EnhancedAppCard(app: app, searchTerm: searchText)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadSearchHistory()
                Task {
                    await apiService.fetchApps()
                }
            }
        }
    }
    
    private func performSearch() {
        guard !searchText.isEmpty else {
            searchResults = []
            return
        }
        
        isSearching = true
        
        // Simulate slight delay for better UX
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            searchResults = enhancedSearch(in: apiService.apps, for: searchText)
            isSearching = false
            
            // Add to search history
            addToSearchHistory(searchText)
        }
    }
    
    private func clearSearch() {
        searchText = ""
        searchResults = []
        showSuggestions = false
    }
    
    private func enhancedSearch(in apps: [AppModel], for query: String) -> [AppModel] {
        let searchTerms = query.lowercased().split(separator: " ")
        
        return apps.filter { app in
            let appName = app.name.lowercased()
            let appDescription = app.description.lowercased()
            let appDeveloper = app.developer?.lowercased() ?? ""
            
            // Check if all search terms are found in any field
            return searchTerms.allSatisfy { term in
                appName.contains(term) ||
                appDescription.contains(term) ||
                appDeveloper.contains(term)
            }
        }.sorted { app1, app2 in
            // Sort by relevance (exact matches first, then partial matches)
            let queryLower = query.lowercased()
            let exactMatch1 = app1.name.lowercased().contains(queryLower)
            let exactMatch2 = app2.name.lowercased().contains(queryLower)
            
            if exactMatch1 != exactMatch2 {
                return exactMatch1
            }
            
            // If both are exact or both are partial, sort by rating
            return (app1.rating ?? 0) > (app2.rating ?? 0)
        }
    }
    
    private func generateSuggestions() -> [String] {
        let suggestions = [
            "Try searching for '\(searchText)' in a different way",
            "Check for typos in '\(searchText)'",
            "Try a broader search term",
            "Search by developer name"
        ]
        return suggestions
    }
    
    // MARK: - Search History Management
    private func loadSearchHistory() {
        if let data = UserDefaults.standard.data(forKey: "SearchHistory"),
           let history = try? JSONDecoder().decode([String].self, from: data) {
            searchHistory = history
        }
    }
    
    private func addToSearchHistory(_ term: String) {
        var history = searchHistory
        history.removeAll { $0 == term } // Remove if exists
        history.insert(term, at: 0) // Add to beginning
        history = Array(history.prefix(10)) // Keep only last 10
        
        searchHistory = history
        
        if let data = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(data, forKey: "SearchHistory")
        }
    }
    
    private func clearSearchHistory() {
        searchHistory = []
        UserDefaults.standard.removeObject(forKey: "SearchHistory")
    }
}

struct EnhancedSearchBar: View {
    @Binding var text: String
    @Binding var isSearching: Bool
    @Binding var showSuggestions: Bool
    let onSearch: () -> Void
    let onClear: () -> Void
    
    @State private var searchTask: Task<Void, Never>?
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search apps...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .onSubmit(onSearch)
                .onChange(of: text) { newValue in
                    // Cancel previous search task
                    searchTask?.cancel()
                    
                    if newValue.isEmpty {
                        showSuggestions = false
                        onClear()
                    } else {
                        showSuggestions = true
                        
                        // Debounced real-time search
                        searchTask = Task {
                            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms delay
                            
                            if !Task.isCancelled {
                                await MainActor.run {
                                    onSearch()
                                }
                            }
                        }
                    }
                }
            
            if isSearching {
                ProgressView()
                    .scaleEffect(0.8)
                    .foregroundColor(.secondary)
            } else if !text.isEmpty {
                Button(action: {
                    text = ""
                    onClear()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        )
    }
}

struct SearchHistorySection: View {
    let history: [String]
    let onTapHistory: (String) -> Void
    let onClearHistory: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Search History")
                    .font(.headline)
                    .foregroundColor(.secondary)
                Spacer()
                Button(action: onClearHistory) {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                }
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(history, id: \.self) { term in
                        Button(action: { onTapHistory(term) }) {
                            Text(term)
                                .font(.subheadline)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

struct PopularSearchesSection: View {
    let searches: [String]
    let onTapSearch: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Popular Searches")
                    .font(.headline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(searches, id: \.self) { term in
                        Button(action: { onTapSearch(term) }) {
                            Text(term)
                                .font(.subheadline)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

struct RecentAppsSection: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Searches")
                    .font(.headline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(apps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            VStack(alignment: .leading, spacing: 8) {
                                if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color.gray.opacity(0.2))
                                    }
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(12)
                                } else {
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 60, height: 60)
                                        .overlay(
                                            Image(systemName: "app.badge")
                                                .foregroundColor(.gray)
                                        )
                                }
                                Text(app.name)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

struct EnhancedAppCard: View {
    let app: AppModel
    let searchTerm: String
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    // App Icon
                    if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.2))
                        }
                        .frame(width: 60, height: 60)
                        .cornerRadius(12)
                    } else {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 60, height: 60)
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                            )
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(app.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(2)
                        
                        if let developer = app.developer {
                            Text(developer)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            if let rating = app.rating {
                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                        .font(.caption)
                                    Text(String(format: "%.1f", rating))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            if let price = app.price {
                                Text(price == "0" ? "Free" : "$\(price)")
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(price == "0" ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                                    .foregroundColor(price == "0" ? .green : .blue)
                                    .cornerRadius(4)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    if app.is_featured == true {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                    }
                }
                
                // App Description
                Text(app.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                
                // Screenshots
                if let screenshots = app.screenshots, !screenshots.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(screenshots.prefix(3)) { screenshot in
                                if let url = URL(string: screenshot.url) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color.gray.opacity(0.2))
                                    }
                                    .frame(width: 120, height: 80)
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FavoritesView: View {
    var body: some View {
        NavigationView {
            VStack {
                Image(systemName: "heart")
                    .font(.system(size: 50))
                    .foregroundColor(.secondary)
                Text("Favorites")
                    .font(.title2)
                    .fontWeight(.semibold)
                Text("Your favorite apps will appear here")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Favorites")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct AppDetailView: View {
    let app: AppModel
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header Section
                HStack(alignment: .top, spacing: 20) {
                    // App Icon - Enhanced
                    if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 24)
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .overlay(
                                    Image(systemName: "app.badge")
                                        .font(.system(size: 40))
                                        .foregroundColor(.white)
                                )
                        }
                        .frame(width: 120, height: 120)
                        .cornerRadius(24)
                        .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 6)
                    } else {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 120, height: 120)
                            .overlay(
                                Image(systemName: "app.badge")
                                    .font(.system(size: 40))
                                    .foregroundColor(.white)
                            )
                            .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 6)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text(app.name)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        if let developer = app.developer {
                            Text(developer)
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack(spacing: 16) {
                            if let rating = app.rating {
                                HStack(spacing: 4) {
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                        .font(.title3)
                                    Text(String(format: "%.1f", rating))
                                        .font(.title3)
                                        .fontWeight(.semibold)
                                }
                            }
                            
                            if let price = app.price {
                                Text(price == "0" ? "Free" : "$\(price)")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(
                                        price == "0" 
                                            ? LinearGradient(colors: [Color.green.opacity(0.2), Color.green.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                                            : LinearGradient(colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                                    )
                                    .foregroundColor(price == "0" ? .green : .blue)
                                    .cornerRadius(12)
                            }
                        }
                    }
                    
                    Spacer()
                }
                
                // Screenshots Section - Enhanced (moved above description)
                if let screenshots = app.screenshots, !screenshots.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Screenshots")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(screenshots.sorted(by: { ($0.display_order ?? 0) < ($1.display_order ?? 0) })) { screenshot in
                                    if let url = URL(string: screenshot.url) {
                                        VStack(alignment: .leading, spacing: 8) {
                                            AsyncImage(url: url) { image in
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                RoundedRectangle(cornerRadius: 16)
                                                    .fill(Color.gray.opacity(0.2))
                                                    .overlay(
                                                        ProgressView()
                                                            .scaleEffect(1.2)
                                                    )
                                            }
                                            .frame(width: 240, height: 160)
                                            .cornerRadius(16)
                                            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                                            
                                            if let caption = screenshot.caption, !caption.isEmpty {
                                                Text(caption)
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                                    .lineLimit(2)
                                                    .multilineTextAlignment(.leading)
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 4)
                        }
                    }
                }
                
                // Description Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Description")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(app.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineSpacing(4)
                }
                
                // App Information Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("App Information")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    VStack(spacing: 12) {
                        // Debug: Show all fields to see what's available
                        InfoRow(title: "App ID", value: app.id)
                        
                        if let developer = app.developer {
                            InfoRow(title: "Developer", value: developer)
                        } else {
                            InfoRow(title: "Developer", value: "NULL")
                        }
                        
                        if let version = app.version {
                            InfoRow(title: "Version", value: version)
                        } else {
                            InfoRow(title: "Version", value: "NULL")
                        }
                        
                        if let size = app.size {
                            InfoRow(title: "Size", value: formatFileSize(size))
                        } else {
                            InfoRow(title: "Size", value: "NULL")
                        }
                        
                        if let price = app.price {
                            InfoRow(title: "Price", value: price == "0" ? "Free" : "$\(price)")
                        } else {
                            InfoRow(title: "Price", value: "NULL")
                        }
                        
                        if let rating = app.rating {
                            InfoRow(title: "Rating", value: String(format: "%.1f stars", rating))
                        } else {
                            InfoRow(title: "Rating", value: "NULL")
                        }
                        
                        if let ratingCount = app.rating_count {
                            InfoRow(title: "Reviews", value: "\(ratingCount) reviews")
                        } else {
                            InfoRow(title: "Reviews", value: "NULL")
                        }
                        
                        if let releaseDate = app.release_date {
                            InfoRow(title: "Release Date", value: formatDate(releaseDate))
                        } else {
                            InfoRow(title: "Release Date", value: "NULL")
                        }
                        
                        if let lastUpdated = app.last_updated {
                            InfoRow(title: "Last Updated", value: formatDate(lastUpdated))
                        } else {
                            InfoRow(title: "Last Updated", value: "NULL")
                        }
                    }
                }
                
                // Action Buttons - Enhanced
                VStack(spacing: 12) {
                    if let appStoreUrl = app.app_store_url, let url = URL(string: appStoreUrl) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "arrow.down.circle.fill")
                                    .font(.title2)
                                Text("Download on App Store")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.8)]),
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(16)
                            .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                    }
                    
                    if let websiteUrl = app.website_url, let url = URL(string: websiteUrl) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "globe")
                                    .font(.title2)
                                Text("Visit Website")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .foregroundColor(.primary)
                            .cornerRadius(16)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(app.name)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(.systemGroupedBackground))
    }
    
    private func formatFileSize(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return dateString
    }
}

struct InfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 100, alignment: .leading)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct CategoryDetailView: View {
    let category: Category
    @StateObject private var apiService = APIService()
    
    var categoryApps: [AppModel] {
        apiService.apps.filter { $0.category_id == category.id }
    }
    
    var body: some View {
        Group {
            if apiService.isLoading {
                VStack {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Loading apps...")
                        .foregroundColor(.secondary)
                        .padding(.top)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if categoryApps.isEmpty {
                VStack {
                    Image(systemName: "app.badge")
                        .font(.system(size: 50))
                        .foregroundColor(.secondary)
                    Text("No apps in this category")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text("Check back later for new apps")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(categoryApps) { app in
                            AppCard(app: app)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(category.name)
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            Task {
                await apiService.fetchApps()
            }
        }
    }
} 