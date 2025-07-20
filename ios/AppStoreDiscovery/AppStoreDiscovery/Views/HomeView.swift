//
//  HomeView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var apiService = APIService()
    @State private var selectedCategoryId: String? = nil // nil means "All"
    
    // Filtered apps based on selected category
    private var filteredApps: [AppModel] {
        if let selectedCategoryId = selectedCategoryId {
            return apiService.apps.filter { $0.category_id == selectedCategoryId }
        }
        return apiService.apps
    }
    
    // Featured apps from filtered results
    private var featuredApps: [AppModel] {
        filteredApps.filter { $0.is_featured == true }
    }
    
    // Top rated apps from filtered results
    private var topRatedApps: [AppModel] {
        filteredApps
            .filter { $0.rating != nil }
            .sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
    }
    
    // Free apps from filtered results
    private var freeApps: [AppModel] {
        filteredApps.filter { $0.is_free == true }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Categories Horizontal Slider
                    CategoriesPillSlider(
                        categories: apiService.categories,
                        selectedCategoryId: $selectedCategoryId
                    )
                    
                    // Loading state
                    if apiService.isLoading && apiService.apps.isEmpty {
                        ProgressView("Loading apps...")
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        // Featured Apps Carousel
                        if !featuredApps.isEmpty {
                            FeaturedAppsCarousel(apps: Array(featuredApps.prefix(6)))
                        }
                        
                        // Recently Added Apps
                        if !filteredApps.isEmpty {
                            RecentlyAddedSection(apps: Array(filteredApps.prefix(6)))
                        }
                        
                        // Top Rated Apps
                        if !topRatedApps.isEmpty {
                            TopRatedSection(apps: Array(topRatedApps.prefix(6)))
                        }
                        
                        // Free Apps
                        if !freeApps.isEmpty {
                            FreeAppsSection(apps: Array(freeApps.prefix(6)))
                        }
                        
                        // Empty state
                        if filteredApps.isEmpty && !apiService.isLoading {
                            VStack(spacing: 16) {
                                Image(systemName: "apps.iphone")
                                    .font(.system(size: 60))
                                    .foregroundColor(.gray)
                                
                                Text("No apps found")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                
                                if selectedCategoryId != nil {
                                    Text("Try selecting a different category or 'All'")
                                        .font(.body)
                                        .foregroundColor(.secondary)
                                        .multilineTextAlignment(.center)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 200)
                            .padding()
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .navigationTitle("Discover Apps")
            .refreshable {
                await refreshData()
            }
            .task {
                if apiService.apps.isEmpty {
                    await loadInitialData()
                }
            }
        }
    }
    
    // MARK: - Data Loading Functions
    
    @MainActor
    private func refreshData() async {
        // Load data sequentially to prevent race conditions
        await apiService.fetchApps()
        
        // Only fetch categories if apps succeeded and task wasn't cancelled
        if !Task.isCancelled {
            await apiService.fetchCategories()
        }
    }
    
    @MainActor
    private func loadInitialData() async {
        // Only load if we don't have data already
        guard apiService.apps.isEmpty && apiService.categories.isEmpty else { return }
        
        // Load data sequentially to prevent race conditions
        await apiService.fetchApps()
        
        // Only fetch categories if apps succeeded and task wasn't cancelled
        if !Task.isCancelled {
            await apiService.fetchCategories()
        }
    }
}

// MARK: - Categories Pill Slider
struct CategoriesPillSlider: View {
    let categories: [Category]
    @Binding var selectedCategoryId: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Categories")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // "All" pill button
                    CategoryPillButton(
                        title: "All",
                        isSelected: selectedCategoryId == nil
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedCategoryId = nil
                        }
                    }
                    
                    // Category pill buttons
                    ForEach(categories, id: \.id) { category in
                        CategoryPillButton(
                            title: category.name,
                            isSelected: selectedCategoryId == category.id
                        ) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedCategoryId = category.id
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Category Pill Button
struct CategoryPillButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.blue : Color(.systemGray6))
                        .shadow(
                            color: isSelected ? Color.blue.opacity(0.3) : Color.clear,
                            radius: isSelected ? 4 : 0,
                            x: 0,
                            y: 2
                        )
                )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
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
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            FeaturedAppCard(app: app, onTap: nil)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal)
            }
        }
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
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
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
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
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
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

#Preview {
    HomeView()
} 