//
//  ContentView.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var apiService: APIService
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab: NavigationItem = .home
    @State private var searchText = ""
    
    var body: some View {
        NavigationSplitView {
            // Sidebar
            SidebarView(selectedTab: $selectedTab)
        } content: {
            // Content area
            switch selectedTab {
            case .home:
                HomeView()
            case .categories:
                CategoriesView()
            case .search:
                SearchView(searchText: $searchText)
            case .featured:
                FeaturedAppsView()
            case .settings:
                SettingsView()
            }
        } detail: {
            // Detail area (for app details)
            Text("Select an app to view details")
                .foregroundColor(.secondary)
        }
        .navigationTitle(navigationTitle)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button(action: {
                    Task {
                        await apiService.refreshData()
                    }
                }) {
                    Image(systemName: "arrow.clockwise")
                }
                .help("Refresh")
                
                Button(action: {
                    // Toggle search
                    selectedTab = .search
                }) {
                    Image(systemName: "magnifyingglass")
                }
                .help("Search")
            }
        }
        .task {
            // Load initial data
            await apiService.fetchApps()
            await apiService.fetchCategories()
        }
    }
    
    private var navigationTitle: String {
        switch selectedTab {
        case .home:
            return "Home"
        case .categories:
            return "Categories"
        case .search:
            return "Search"
        case .featured:
            return "Featured Apps"
        case .settings:
            return "Settings"
        }
    }
}

// MARK: - Navigation Items

enum NavigationItem: String, CaseIterable {
    case home = "Home"
    case categories = "Categories"
    case search = "Search"
    case featured = "Featured"
    case settings = "Settings"
    
    var icon: String {
        switch self {
        case .home:
            return "house"
        case .categories:
            return "folder"
        case .search:
            return "magnifyingglass"
        case .featured:
            return "star"
        case .settings:
            return "gear"
        }
    }
}

// MARK: - Sidebar View

struct SidebarView: View {
    @Binding var selectedTab: NavigationItem
    
    var body: some View {
        List(NavigationItem.allCases, id: \.self) { item in
            NavigationLink(value: item) {
                Label(item.rawValue, systemImage: item.icon)
            }
        }
        .navigationTitle("Mac App Store Discovery")
        .listStyle(SidebarListStyle())
    }
}

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject var apiService: APIService
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 16)
            ], spacing: 16) {
                ForEach(apiService.apps.prefix(12)) { app in
                    AppCardView(app: app)
                }
            }
            .padding()
        }
        .overlay {
            if apiService.isLoading {
                ProgressView("Loading apps...")
            }
        }
    }
}

// MARK: - Categories View

struct CategoriesView: View {
    @EnvironmentObject var apiService: APIService
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 16)
            ], spacing: 16) {
                ForEach(apiService.categories) { category in
                    CategoryCardView(category: category)
                }
            }
            .padding()
        }
    }
}

// MARK: - Search View

struct SearchView: View {
    @Binding var searchText: String
    @EnvironmentObject var apiService: APIService
    @State private var searchResults: [AppModel] = []
    @State private var isSearching = false
    
    var body: some View {
        VStack {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search apps...", text: $searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onSubmit {
                        Task {
                            await performSearch()
                        }
                    }
            }
            .padding()
            
            if isSearching {
                ProgressView("Searching...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if searchResults.isEmpty && !searchText.isEmpty {
                Text("No apps found")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 16)
                    ], spacing: 16) {
                        ForEach(searchResults) { app in
                            AppCardView(app: app)
                        }
                    }
                    .padding()
                }
            }
        }
    }
    
    private func performSearch() async {
        guard !searchText.isEmpty else {
            searchResults = []
            return
        }
        
        isSearching = true
        searchResults = await apiService.searchApps(query: searchText)
        isSearching = false
    }
}

// MARK: - Featured Apps View

struct FeaturedAppsView: View {
    @EnvironmentObject var apiService: APIService
    
    var featuredApps: [AppModel] {
        apiService.apps.filter { $0.is_featured == true }
    }
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 16)
            ], spacing: 16) {
                ForEach(featuredApps) { app in
                    AppCardView(app: app)
                }
            }
            .padding()
        }
        .overlay {
            if featuredApps.isEmpty {
                Text("No featured apps available")
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        Form {
            Section("Account") {
                if let user = authManager.currentUser {
                    Text("Signed in as: \(user.displayName)")
                    Button("Sign Out") {
                        authManager.signOut()
                    }
                } else {
                    Text("Not signed in")
                }
            }
            
            Section("About") {
                Text("Mac App Store Discovery")
                Text("Version 1.0.0")
                Text("© 2025 iOSstore Team")
            }
        }
        .padding()
    }
}

// MARK: - App Card View

struct AppCardView: View {
    let app: AppModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // App icon
            if let iconUrl = app.icon_url {
                AsyncImage(url: URL(string: iconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 64, height: 64)
                }
                .frame(width: 64, height: 64)
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 64, height: 64)
            }
            
            // App info
            VStack(alignment: .leading, spacing: 4) {
                Text(app.name)
                    .font(.headline)
                    .lineLimit(2)
                
                if let developer = app.developer {
                    Text(developer)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                HStack {
                    Text(app.displayPrice)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(app.isFreeApp ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                        .foregroundColor(app.isFreeApp ? .green : .blue)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    if app.hasRating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                                .font(.caption)
                            Text(String(format: "%.1f", app.rating ?? 0))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// MARK: - Category Card View

struct CategoryCardView: View {
    let category: Category
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "folder.fill")
                .font(.title)
                .foregroundColor(.blue)
                .frame(width: 48, height: 48)
            
            Text(category.displayName)
                .font(.headline)
                .lineLimit(2)
            
            if let description = category.description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

#Preview {
    ContentView()
        .environmentObject(APIService())
        .environmentObject(AuthManager())
} 