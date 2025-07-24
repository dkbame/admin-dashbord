//
//  ContentView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var apiService = APIService()
    @State private var selectedView: SidebarItem = .home
    @State private var searchText = ""
    @State private var selectedApp: AppModel? = nil
    @State private var showingAppDetail = false
    
    var body: some View {
        NavigationView {
            // Sidebar
            SidebarView(selectedView: $selectedView)
                .frame(minWidth: 200, idealWidth: 250, maxWidth: 300)
                .toolbar {
                    ToolbarItem(placement: .navigation) {
                        Button(action: toggleSidebar) {
                            Image(systemName: "sidebar.left")
                        }
                    }
                }
            
            // Main content area
            Group {
                if showingAppDetail, let app = selectedApp {
                    // Show app detail view for NVIDIA compatibility
                    AppDetailView(app: app)
                        .onAppear {
                            print("🚀 ContentView: NAVIGATION view appeared for app: \(app.name)")
                            print("🛡️ ContentView: Using navigation instead of sheet for NVIDIA compatibility")
                        }
                        .toolbar {
                            ToolbarItem(placement: .navigation) {
                                Button("← Back") {
                                    showingAppDetail = false
                                    selectedApp = nil
                                    print("🔙 ContentView: Returned to main view from navigation")
                                }
                            }
                        }
                } else {
                    // Regular navigation
                switch selectedView {
                case .home:
                        HomeView(selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                        .environmentObject(apiService)
                case .categories:
                        CategoriesView(selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                        .environmentObject(apiService)
                case .search:
                        SearchView(selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                        .environmentObject(apiService)
                case .favorites:
                        FavoritesView(selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                        .environmentObject(apiService)
                    case .settings:
                        SettingsView()
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    HStack {
                        // Search bar in toolbar for macOS
                        if selectedView == .search {
                            TextField("Search apps...", text: $searchText)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .frame(maxWidth: 300)
                        }
                        
                        Button(action: refreshData) {
                            Image(systemName: "arrow.clockwise")
                        }
                        .help("Refresh data")
                    }
                }
            }
        }
        .onAppear {
            // Debug: Log Metal compatibility status
            print("📱 ContentView: App appeared - checking Metal compatibility status")
            print("🔧 MetalCompatibility.shouldUseSoftwareRendering: \(MetalCompatibility.shared.shouldUseSoftwareRendering)")
            
            // Check current environment variables
            if let metalWrapper = getenv("METAL_DEVICE_WRAPPER_TYPE") {
                print("🔧 METAL_DEVICE_WRAPPER_TYPE = \(String(cString: metalWrapper))")
            } else {
                print("⚠️ METAL_DEVICE_WRAPPER_TYPE not set!")
            }
            
            if let swiftuiMetal = getenv("SWIFTUI_DISABLE_METAL") {
                print("🔧 SWIFTUI_DISABLE_METAL = \(String(cString: swiftuiMetal))")
            } else {
                print("⚠️ SWIFTUI_DISABLE_METAL not set!")
            }
            
            // Initialize data when app launches
            Task {
                await apiService.fetchApps()
                await apiService.fetchCategories()
            }
        }
    }
    
    private func toggleSidebar() {
        NSApp.keyWindow?.firstResponder?.tryToPerform(#selector(NSSplitViewController.toggleSidebar(_:)), with: nil)
    }
    
    private func refreshData() {
        Task {
            await apiService.fetchApps()
            await apiService.fetchCategories()
        }
    }
}

// MARK: - Sidebar Items
enum SidebarItem: String, CaseIterable {
    case home = "Home"
    case categories = "Categories"
    case search = "Search"
    case favorites = "Favorites"
    case settings = "Settings"
    
    var iconName: String {
        switch self {
        case .home: return "house"
        case .categories: return "folder"
        case .search: return "magnifyingglass"
        case .favorites: return "heart"
        case .settings: return "gear"
        }
    }
}

#Preview {
    ContentView()
} 