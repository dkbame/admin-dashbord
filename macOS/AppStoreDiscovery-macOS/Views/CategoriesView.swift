//
//  CategoriesView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct CategoriesView: View {
    @EnvironmentObject var apiService: APIService
    @State private var selectedCategory: Category?
    @State private var categoryStats: [CategoryStats] = []
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    var body: some View {
        HStack(spacing: 0) {
            // Category list sidebar
            VStack {
                List(apiService.categories, id: \.id) { category in
                    CategoryRow(category: category, stats: categoryStats.first { $0.id == category.id })
                        .onTapGesture {
                            selectedCategory = category
                        }
                        .background(selectedCategory?.id == category.id ? Color.accentColor.opacity(0.2) : Color.clear)
                        .cornerRadius(6)
                }
                .navigationTitle("Categories")
            }
            .frame(minWidth: 250, idealWidth: 300, maxWidth: 350)
            
            Divider()
            
            // Category detail content
            if let selectedCategory = selectedCategory {
                CategoryDetailView(category: selectedCategory, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                    .environmentObject(apiService)
            } else {
                // Default view when no category is selected
                CategoryOverview(categories: apiService.categories, stats: categoryStats)
            }
        }
        .onAppear {
            loadCategoryStats()
            if selectedCategory == nil && !apiService.categories.isEmpty {
                selectedCategory = apiService.categories.first
            }
        }
    }
    
    private func loadCategoryStats() {
        Task {
            let stats = await apiService.fetchCategoryStats()
            await MainActor.run {
                self.categoryStats = stats
            }
        }
    }
}

// MARK: - Category Row
struct CategoryRow: View {
    let category: Category
    let stats: CategoryStats?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(category.name)
                .font(.headline)
                .fontWeight(.medium)
            
            if let stats = stats {
                HStack(spacing: 12) {
                    Text("\(stats.app_count) apps")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let avgRating = stats.avg_rating, avgRating > 0 {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", avgRating))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Category Overview
struct CategoryOverview: View {
    let categories: [Category]
    let stats: [CategoryStats]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20), count: 2), spacing: 20) {
                ForEach(categories, id: \.id) { category in
                    CategoryOverviewCard(category: category, stats: stats.first { $0.id == category.id })
                }
            }
            .padding()
        }
        .navigationTitle("All Categories")
    }
}

// MARK: - Category Overview Card
struct CategoryOverviewCard: View {
    let category: Category
    let stats: CategoryStats?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(category.name)
                    .font(.title3)
                    .fontWeight(.semibold)
                
                if let stats = stats {
                    HStack {
                        Text("\(stats.app_count) apps")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        if let avgRating = stats.avg_rating, avgRating > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.caption)
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", avgRating))
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    HStack(spacing: 16) {
                        if stats.free_app_count > 0 {
                            Text("\(stats.free_app_count) free")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.1))
                                .foregroundColor(.green)
                                .cornerRadius(8)
                        }
                        
                        if stats.featured_app_count > 0 {
                            Text("\(stats.featured_app_count) featured")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(8)
                        }
                        
                        Spacer()
                    }
                }
            }
            
            Spacer()
        }
        .padding()
        .frame(height: 120)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Category Detail View
struct CategoryDetailView: View {
    let category: Category
    @EnvironmentObject var apiService: APIService
    @State private var categoryApps: [AppModel] = []
    @State private var isLoading = false
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    private var filteredApps: [AppModel] {
        apiService.apps.filter { $0.category_id == category.id }
    }
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Category header
                VStack(alignment: .leading, spacing: 8) {
                    Text(category.name)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("\(filteredApps.count) apps available")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                // Apps grid
                if filteredApps.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "folder")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        
                        Text("No apps in this category")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                    .frame(height: 200)
                } else {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
                        ForEach(filteredApps, id: \.id) { app in
                            AppCard(app: app, style: .standard, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .navigationTitle(category.name)
    }
}

#Preview {
    CategoriesView(selectedApp: .constant(nil), showingAppDetail: .constant(false))
        .environmentObject(APIService())
} 