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
            // Initialize data when app launches
            Task {
                await apiService.fetchApps()
                await apiService.fetchCategories()
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
                            selectedCategory = category
                            showingCategoryDetail = true
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Categories")
            .refreshable {
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

// MARK: - Search View
struct SearchView: View {
    let apiService: APIService
    @State private var searchText = ""
    @State private var isSearching = false
    
    private var filteredApps: [AppModel] {
        if searchText.isEmpty {
            return []
        }
        return apiService.apps.filter { app in
            app.name.localizedCaseInsensitiveContains(searchText) ||
            (app.developer?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            app.description.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Search Bar
                SearchBar(text: $searchText, isSearching: $isSearching)
                
                // Search Results
                if isSearching {
                    if filteredApps.isEmpty && !searchText.isEmpty {
                        EmptySearchView(searchText: searchText)
                    } else {
                        SearchResultsView(apps: filteredApps)
                    }
                } else {
                    SearchSuggestionsView()
                }
                
                Spacer()
            }
            .navigationTitle("Search")
        }
    }
}

// MARK: - Search Bar
struct SearchBar: View {
    @Binding var text: String
    @Binding var isSearching: Bool
    
    var body: some View {
        HStack {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search apps...", text: $text)
                    .onTapGesture {
                        isSearching = true
                    }
                
                if !text.isEmpty {
                    Button(action: {
                        text = ""
                        isSearching = false
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(8)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            
            if isSearching {
                Button("Cancel") {
                    text = ""
                    isSearching = false
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
                                                 to: nil, from: nil, for: nil)
                }
                .transition(.move(edge: .trailing))
                .animation(.default, value: isSearching)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Search Results View
struct SearchResultsView: View {
    let apps: [AppModel]
    
    var body: some View {
        List(apps, id: \.id) { app in
            AppListRow(app: app)
        }
        .listStyle(PlainListStyle())
    }
}

// MARK: - Empty Search View
struct EmptySearchView: View {
    let searchText: String
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Results Found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("No apps found for \"\(searchText)\"")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Search Suggestions View
struct SearchSuggestionsView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("Search Apps")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Search for apps by name, developer, or description")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Favorites View
struct FavoritesView: View {
    let apiService: APIService
    @State private var favoriteAppIds: Set<String> = []
    
    private var favoriteApps: [AppModel] {
        apiService.apps.filter { favoriteAppIds.contains($0.id) }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if favoriteApps.isEmpty {
                    EmptyFavoritesView()
                } else {
                    List(favoriteApps, id: \.id) { app in
                        AppListRow(app: app)
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Favorites")
            .onAppear {
                loadFavorites()
            }
        }
    }
    
    private func loadFavorites() {
        // TODO: Load favorites from UserDefaults or database
        // For now, using a placeholder
        favoriteAppIds = []
    }
}

// MARK: - Empty Favorites View
struct EmptyFavoritesView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "heart")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Favorites Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Apps you favorite will appear here")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

#Preview {
    MainTabView()
} 