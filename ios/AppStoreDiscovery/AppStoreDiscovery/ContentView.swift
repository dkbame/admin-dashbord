//
//  ContentView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

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
    @State private var currentFeaturedIndex = 0
    @State private var autoScrollTimer: Timer?
    @State private var isAutoScrolling = true
    
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
                        VStack(spacing: 0) {
                            // Featured Carousel
                            if !featuredApps.isEmpty {
                                FeaturedCarouselView(
                                    apps: featuredApps,
                                    currentIndex: $currentFeaturedIndex,
                                    isAutoScrolling: $isAutoScrolling
                                )
                                .frame(height: 280)
                            }
                            
                            // Category Sections
                            VStack(spacing: 24) {
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
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await apiService.fetchApps()
            }
            .onAppear {
                Task {
                    await apiService.fetchApps()
                }
                startAutoScroll()
            }
            .onDisappear {
                stopAutoScroll()
            }
        }
    }
    
    private func startAutoScroll() {
        guard featuredApps.count > 1 else { return }
        autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { _ in
            if isAutoScrolling {
                withAnimation(.easeInOut(duration: 0.5)) {
                    currentFeaturedIndex = (currentFeaturedIndex + 1) % featuredApps.count
                }
            }
        }
    }
    
    private func stopAutoScroll() {
        autoScrollTimer?.invalidate()
        autoScrollTimer = nil
    }
}

// Featured Carousel View
struct FeaturedCarouselView: View {
    let apps: [AppModel]
    @Binding var currentIndex: Int
    @Binding var isAutoScrolling: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Carousel
            TabView(selection: $currentIndex) {
                ForEach(Array(apps.enumerated()), id: \.element.id) { index, app in
                    FeaturedAppCard(app: app)
                        .tag(index)
                        .onTapGesture {
                            // Pause auto-scroll on tap
                            isAutoScrolling = false
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                isAutoScrolling = true
                            }
                        }
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            .frame(height: 240)
            
            // Page Indicators
            HStack(spacing: 8) {
                ForEach(0..<apps.count, id: \.self) { index in
                    Circle()
                        .fill(index == currentIndex ? Color.blue : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .scaleEffect(index == currentIndex ? 1.2 : 1.0)
                        .animation(.easeInOut(duration: 0.2), value: currentIndex)
                }
            }
            .padding(.top, 8)
        }
        .padding(.horizontal)
    }
}

// Featured App Card
struct FeaturedAppCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            ZStack {
                // Background with screenshot or gradient fallback
                if let screenshots = app.screenshots, !screenshots.isEmpty, let firstScreenshotUrl = URL(string: screenshots[0].url) {
                    AsyncImage(url: firstScreenshotUrl) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .clipped()
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.blue.opacity(0.1),
                                        Color.purple.opacity(0.1)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    .cornerRadius(20)
                    .overlay(
                        // Dark overlay for better text readability
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.black.opacity(0.3),
                                        Color.black.opacity(0.1)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                } else {
                    // Fallback gradient background
                    RoundedRectangle(cornerRadius: 20)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.blue.opacity(0.1),
                                    Color.purple.opacity(0.1)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                }
                
                HStack(spacing: 20) {
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
                                        .font(.system(size: 30))
                                )
                        }
                        .frame(width: 120, height: 120)
                        .cornerRadius(20)
                        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
                    } else {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 120, height: 120)
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                                    .font(.system(size: 30))
                            )
                            .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
                    }
                    
                                        // App Info
                    VStack(alignment: .leading, spacing: 12) {
                        Spacer()
                        
                        Text(app.name)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .lineLimit(2)
                            .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                        
                        if let developer = app.developer {
                            Text(developer)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.9))
                                .lineLimit(1)
                                .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                        }
                    }
                    
                    Spacer()
                }
                .padding(20)
            }
        }
        .buttonStyle(PlainButtonStyle())
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
    
    var body: some View {
        NavigationView {
            VStack {
                SearchBar(text: $searchText, onSubmit: performSearch)
                
                if searchText.isEmpty {
                    VStack {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("Search for apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Enter keywords to find apps")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if searchResults.isEmpty {
                    VStack {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No results found")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Try different keywords")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(searchResults) { app in
                                AppCard(app: app)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
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
        
        searchResults = apiService.apps.filter { app in
            app.name.localizedCaseInsensitiveContains(searchText) ||
            app.description.localizedCaseInsensitiveContains(searchText) ||
            (app.developer?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    let onSubmit: () -> Void
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search apps...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .onSubmit(onSubmit)
            
            if !text.isEmpty {
                Button(action: {
                    text = ""
                    onSubmit()
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