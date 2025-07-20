//
//  ContentView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Content View
struct ContentView: View {
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
                    Image(systemName: "square.grid.2x2.fill")
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

#Preview {
    ContentView()
} 