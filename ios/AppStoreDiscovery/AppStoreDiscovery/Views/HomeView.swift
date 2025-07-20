//
//  HomeView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var apiService = APIService()
    @State private var selectedCategory: Category?
    @State private var showingCategoryDetail = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Featured Apps Carousel
                    if !apiService.apps.filter({ $0.is_featured == true }).isEmpty {
                        FeaturedAppsCarousel(apps: apiService.apps.filter { $0.is_featured == true })
                    }
                    
                    // Categories Grid
                    CategoriesGridView(
                        categories: apiService.categories,
                        onCategorySelected: { category in
                            selectedCategory = category
                            showingCategoryDetail = true
                        }
                    )
                    
                    // Recently Added Apps
                    if !apiService.apps.isEmpty {
                        RecentlyAddedSection(apps: Array(apiService.apps.prefix(6)))
                    }
                    
                    // Top Rated Apps
                    let topRatedApps = apiService.apps
                        .filter { $0.rating != nil }
                        .sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
                        .prefix(6)
                    
                    if !topRatedApps.isEmpty {
                        TopRatedSection(apps: Array(topRatedApps))
                    }
                    
                    // Free Apps
                    let freeApps = apiService.apps
                        .filter { $0.is_free == true }
                        .prefix(6)
                    
                    if !freeApps.isEmpty {
                        FreeAppsSection(apps: Array(freeApps))
                    }
                }
                .padding()
            }
            .navigationTitle("Discover Apps")
            .refreshable {
                await apiService.fetchApps()
                await apiService.fetchCategories()
            }
            .task {
                await apiService.fetchApps()
                await apiService.fetchCategories()
            }
            .sheet(isPresented: $showingCategoryDetail) {
                if let category = selectedCategory {
                    CategoryDetailView(category: category, apiService: apiService)
                }
            }
        }
    }
}

// MARK: - Featured Apps Carousel
struct FeaturedAppsCarousel: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Featured Apps")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
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
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let firstScreenshot = app.screenshots?.first {
                HighResCardImage(url: firstScreenshot.url, size: CGSize(width: 280, height: 160))
            } else {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 280, height: 160)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(app.name)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(app.developer)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack {
                    if app.is_free == true {
                        Text("Free")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.2))
                            .foregroundColor(.green)
                            .cornerRadius(8)
                    } else {
                        Text("$\(app.price ?? "0")")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.2))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                    
                    Spacer()
                    
                    if let rating = app.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                                .font(.caption)
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                        }
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
}

// MARK: - Categories Grid View
struct CategoriesGridView: View {
    let categories: [Category]
    let onCategorySelected: (Category) -> Void
    
    private let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Categories")
                .font(.title2)
                .fontWeight(.bold)
            
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(categories, id: \.id) { category in
                    CategoryCard(category: category) {
                        onCategorySelected(category)
                    }
                }
            }
        }
    }
}

// MARK: - Category Card
struct CategoryCard: View {
    let category: Category
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.blue.opacity(0.1))
                    .frame(height: 80)
                    .overlay(
                        Image(systemName: "folder.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                    )
                
                Text(category.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Recently Added Section
struct RecentlyAddedSection: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recently Added")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        AppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Top Rated Section
struct TopRatedSection: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top Rated")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        AppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Free Apps Section
struct FreeAppsSection: View {
    let apps: [AppModel]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Free Apps")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        AppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - App Card
struct AppCard: View {
    let app: AppModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let iconUrl = app.icon_url {
                AsyncImage(url: URL(string: iconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 80, height: 80)
                .cornerRadius(12)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 80, height: 80)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(app.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)
                
                Text(app.developer)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                
                if app.is_free == true {
                    Text("Free")
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.2))
                        .foregroundColor(.green)
                        .cornerRadius(6)
                } else {
                    Text("$\(app.price ?? "0")")
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .foregroundColor(.blue)
                        .cornerRadius(6)
                }
            }
        }
        .frame(width: 120)
    }
}

#Preview {
    HomeView()
} 