//
//  HomeView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var apiService: APIService
    @State private var selectedCategoryId: String? = nil
    @State private var featuredApps: [AppModel] = []
    @State private var freeApps: [AppModel] = []
    @State private var newReleases: [AppModel] = []
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    // Filtered apps based on selected category
    private var filteredApps: [AppModel] {
        if let selectedCategoryId = selectedCategoryId {
            return apiService.apps.filter { $0.category_id == selectedCategoryId }
        }
        return apiService.apps
    }
    
    // Top rated apps from filtered results
    private var topRatedApps: [AppModel] {
        filteredApps
            .filter { $0.rating != nil }
            .sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
            .prefix(6)
            .map { $0 }
    }
    
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                // Categories Horizontal Slider
                CategoriesPillSlider(
                    categories: apiService.categories,
                    selectedCategoryId: $selectedCategoryId
                )
                
                // Loading state
                if apiService.isLoading && apiService.apps.isEmpty {
                    HStack {
                        Spacer()
                        ProgressView("Loading apps...")
                            .progressViewStyle(CircularProgressViewStyle())
                        Spacer()
                    }
                    .frame(height: 200)
                } else {
                    // Featured Apps Section
                    if !featuredApps.isEmpty {
                        AppSectionView(
                            title: "Featured Apps",
                            apps: Array(featuredApps.prefix(6)),
                            layout: .grid,
                            selectedApp: $selectedApp,
                            showingAppDetail: $showingAppDetail
                        )
                    }
                    
                    // Top Rated Apps Section
                    if !topRatedApps.isEmpty {
                        AppSectionView(
                            title: "Top Rated",
                            apps: topRatedApps,
                            layout: .horizontal,
                            selectedApp: $selectedApp,
                            showingAppDetail: $showingAppDetail
                        )
                    }
                    
                    // Free Apps Section
                    if !freeApps.isEmpty {
                        AppSectionView(
                            title: "Free Apps",
                            apps: Array(freeApps.prefix(6)),
                            layout: .horizontal,
                            selectedApp: $selectedApp,
                            showingAppDetail: $showingAppDetail
                        )
                    }
                    
                    // New Releases Section
                    if !newReleases.isEmpty {
                        AppSectionView(
                            title: "New Releases",
                            apps: Array(newReleases.prefix(6)),
                            layout: .grid,
                            selectedApp: $selectedApp,
                            showingAppDetail: $showingAppDetail
                        )
                    }
                    
                    // All Apps Section
                    if !filteredApps.isEmpty {
                        let displayApps = Array(filteredApps.prefix(12))
                        AppSectionView(
                            title: selectedCategoryId == nil ? "All Apps" : "Category Apps",
                            apps: displayApps,
                            layout: .grid,
                            selectedApp: $selectedApp,
                            showingAppDetail: $showingAppDetail
                        )
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Home")
        .onAppear {
            loadSectionData()
        }
    }
    
    private func loadSectionData() {
        Task {
            async let featured = apiService.fetchFeaturedApps()
            async let free = apiService.fetchFreeApps()
            async let releases = apiService.fetchNewReleases()
            
            let (featuredResult, freeResult, releasesResult) = await (featured, free, releases)
            
            await MainActor.run {
                self.featuredApps = featuredResult
                self.freeApps = freeResult
                self.newReleases = releasesResult
            }
        }
    }
}

// MARK: - Categories Pill Slider
struct CategoriesPillSlider: View {
    let categories: [Category]
    @Binding var selectedCategoryId: String?
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // "All" category pill
                CategoryPill(
                    name: "All",
                    isSelected: selectedCategoryId == nil
                ) {
                    selectedCategoryId = nil
                }
                
                // Category pills
                ForEach(categories, id: \.id) { category in
                    CategoryPill(
                        name: category.name,
                        isSelected: selectedCategoryId == category.id
                    ) {
                        selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Category Pill
struct CategoryPill: View {
    let name: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(name)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? Color.accentColor : Color(.controlBackgroundColor))
                )
                .foregroundColor(isSelected ? .white : .primary)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - App Section View
struct AppSectionView: View {
    let title: String
    let apps: [AppModel]
    let layout: LayoutType
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    enum LayoutType {
        case horizontal
        case grid
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
            }
            .padding(.horizontal)
            
            switch layout {
            case .horizontal:
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(apps, id: \.id) { app in
                            AppCard(app: app, style: .compact, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                                .frame(width: 300)
                        }
                    }
                    .padding(.horizontal)
                }
            case .grid:
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
                    ForEach(apps, id: \.id) { app in
                        AppCard(app: app, style: .standard, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

#Preview {
    HomeView(selectedApp: .constant(nil), showingAppDetail: .constant(false))
        .environmentObject(APIService())
} 