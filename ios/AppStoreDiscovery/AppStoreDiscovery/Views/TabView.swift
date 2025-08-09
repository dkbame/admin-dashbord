//
//  TabView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct MainTabView: View {
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
                    Image(systemName: "folder.fill")
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
            // Initialize data when app launches using optimized loading
            Task {
                await apiService.loadHomePageData()
            }
        }
    }
}

// MARK: - Categories View
struct CategoriesView: View {
    let apiService: APIService
    @State private var selectedCategory: Category?
    @State private var showingCategoryDetail = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 20) {
                    ForEach(apiService.categories, id: \.id) { category in
                        CategoryCard(category: category) {
                            print("[DEBUG] CategoriesView - Category tapped: \(category.name)")
                            selectedCategory = category
                            showingCategoryDetail = true
                            print("[DEBUG] CategoriesView - showingCategoryDetail set to true")
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Categories")
            .refreshable {
                await apiService.loadHomePageData()
            }
            .sheet(isPresented: $showingCategoryDetail) {
                if let category = selectedCategory {
                    CategoryDetailView(category: category, apiService: apiService)
                }
            }
            .onChange(of: showingCategoryDetail) { _, newValue in
                print("[DEBUG] CategoriesView - showingCategoryDetail changed to: \(newValue)")
                if newValue, let category = selectedCategory {
                    print("[DEBUG] CategoriesView - Presenting CategoryDetailView for: \(category.name)")
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
                // Category icon placeholder
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "folder.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    )
                
                Text(category.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Search View
struct SearchView: View {
    let apiService: APIService
    @State private var searchText = ""
    @State private var searchResults: [AppModel] = []
    @State private var isSearching = false
    
    var body: some View {
        NavigationView {
            VStack {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    
                    TextField("Search apps...", text: $searchText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .onSubmit {
                            Task {
                                await performSearch()
                            }
                        }
                    
                    if !searchText.isEmpty {
                        Button("Clear") {
                            searchText = ""
                            searchResults = []
                        }
                        .foregroundColor(.blue)
                    }
                }
                .padding()
                
                // Search results
                if isSearching {
                    ProgressView("Searching...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if searchResults.isEmpty && !searchText.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("No apps found")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Try different keywords")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if searchResults.isEmpty && searchText.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("Search for apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Enter app name, developer, or description")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(searchResults, id: \.id) { app in
                                NavigationLink(destination: AppDetailView(app: app)) {
                                    AppCard(app: app)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Search")
        }
    }
    
    private func performSearch() async {
        guard !searchText.isEmpty else { return }
        
        await MainActor.run {
            isSearching = true
        }
        
        // TODO: Implement search functionality
        // For now, just simulate a search
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second delay
        
        await MainActor.run {
            isSearching = false
            // searchResults = await apiService.searchApps(query: searchText)
        }
    }
}

// MARK: - Favorites View
struct FavoritesView: View {
    let apiService: APIService
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.red)
                
                Text("Favorites")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Your favorite apps will appear here")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                Text("Coming soon...")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Favorites")
        }
    }
}

#Preview {
    MainTabView()
} 