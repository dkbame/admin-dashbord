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
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Categories Horizontal Slider
                    CategoriesPillSlider(
                        categories: apiService.categories,
                        selectedCategoryId: $selectedCategoryId,
                        isLoading: apiService.isInitialLoading
                    )
                    
                    // Loading state
                    if apiService.isInitialLoading {
                        VStack(spacing: 16) {
                            ProgressView("Loading apps...")
                                .frame(maxWidth: .infinity, minHeight: 200)
                            
                            // Show skeleton loading for better UX
                            SkeletonLoadingView()
                        }
                    } else {
                        // Featured Apps Section
                        if !apiService.featuredApps.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Featured Apps")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    
                                    Spacer()
                                    
                                    NavigationLink(destination: AllFeaturedAppsView()) {
                                        Text("View All")
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(apiService.featuredApps.prefix(6), id: \.id) { app in
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
                        
                        // Recently Added Apps
                        if !apiService.recentlyAddedApps.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Recently Added")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    
                                    Spacer()
                                    
                                    NavigationLink(destination: AllRecentlyAddedAppsView()) {
                                        Text("View All")
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(apiService.recentlyAddedApps.prefix(6), id: \.id) { app in
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
                        
                        // Paid Apps
                        if !apiService.paidApps.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Paid Apps")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    
                                    Spacer()
                                    
                                    NavigationLink(destination: AllPaidAppsView()) {
                                        Text("View All")
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(apiService.paidApps.prefix(6), id: \.id) { app in
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
                        
                        // Top Rated Apps
                        if !apiService.topRatedApps.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Top Rated")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    
                                    Spacer()
                                    
                                    NavigationLink(destination: AllTopRatedAppsView()) {
                                        Text("View All")
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(apiService.topRatedApps.prefix(6), id: \.id) { app in
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
                        
                        // Free Apps
                        if !apiService.freeApps.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Free Apps")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    
                                    Spacer()
                                    
                                    NavigationLink(destination: AllFreeAppsView()) {
                                        Text("View All")
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(apiService.freeApps.prefix(6), id: \.id) { app in
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
                        
                        // Empty state
                        if apiService.featuredApps.isEmpty && 
                           apiService.recentlyAddedApps.isEmpty && 
                           apiService.topRatedApps.isEmpty && 
                           apiService.freeApps.isEmpty && 
                           !apiService.isInitialLoading {
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
                if apiService.featuredApps.isEmpty {
                    await loadInitialData()
                }
            }
        }
    }
    
    // MARK: - Data Loading Functions
    
    @MainActor
    private func refreshData() async {
        await apiService.loadHomePageData()
    }
    
    @MainActor
    private func loadInitialData() async {
        await apiService.loadHomePageData()
    }
}

// MARK: - Skeleton Loading View
struct SkeletonLoadingView: View {
    var body: some View {
        VStack(spacing: 24) {
            // Featured Apps Skeleton
            VStack(alignment: .leading, spacing: 12) {
                Text("Featured Apps")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.horizontal)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(0..<3, id: \.self) { _ in
                            SkeletonAppCard()
                        }
                    }
                    .padding(.horizontal)
                }
            }
            
            // Recently Added Skeleton
            VStack(alignment: .leading, spacing: 12) {
                Text("Recently Added")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.horizontal)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(0..<3, id: \.self) { _ in
                            SkeletonAppCard()
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - Skeleton App Card
struct SkeletonAppCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // App icon skeleton
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray5))
                .frame(width: 80, height: 80)
            
            // App name skeleton
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 60, height: 12)
            
            // Developer skeleton
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 40, height: 10)
        }
        .frame(width: 80)
    }
}

// MARK: - Categories Pill Slider
struct CategoriesPillSlider: View {
    let categories: [Category]
    @Binding var selectedCategoryId: String?
    let isLoading: Bool
    
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
                    if isLoading {
                        // Show skeleton categories while loading
                        ForEach(0..<5, id: \.self) { _ in
                            SkeletonCategoryPill()
                        }
                    } else {
                        ForEach(categories, id: \.id) { category in
                            CategoryPillButton(
                                title: category.name,
                                isSelected: selectedCategoryId == category.id
                            ) {
                                print("[DEBUG] CategoriesPillSlider - Category tapped: \(category.name) (ID: \(category.id))")
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedCategoryId = category.id
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .onAppear {
            print("[DEBUG] CategoriesPillSlider - onAppear")
            print("[DEBUG] CategoriesPillSlider - categories count: \(categories.count)")
            print("[DEBUG] CategoriesPillSlider - isLoading: \(isLoading)")
            for (index, category) in categories.enumerated() {
                print("[DEBUG] CategoriesPillSlider - Category \(index): \(category.name) (ID: \(category.id))")
            }
        }
    }
}

// MARK: - Skeleton Category Pill
struct SkeletonCategoryPill: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(Color(.systemGray5))
            .frame(width: 80, height: 32)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color(.systemGray4), lineWidth: 1)
            )
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



#Preview {
    HomeView()
} 