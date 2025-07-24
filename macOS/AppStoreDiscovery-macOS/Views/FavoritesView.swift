//
//  FavoritesView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct FavoritesView: View {
    @EnvironmentObject var apiService: APIService
    @State private var favoriteAppIds: Set<String> = []
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    private var favoriteApps: [AppModel] {
        apiService.apps.filter { favoriteAppIds.contains($0.id) }
    }
    
    var body: some View {
        VStack {
            if favoriteApps.isEmpty {
                EmptyFavoritesView()
            } else {
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
                        ForEach(favoriteApps, id: \.id) { app in
                            AppCard(app: app, style: .standard, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                                .contextMenu {
                                    Button("Remove from Favorites") {
                                        removeFromFavorites(app.id)
                                    }
                                }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Favorites")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                if !favoriteApps.isEmpty {
                    Button("Clear All") {
                        clearAllFavorites()
                    }
                }
            }
        }
        .onAppear {
            loadFavorites()
        }
    }
    
    private func loadFavorites() {
        if let data = UserDefaults.standard.data(forKey: "favoriteApps"),
           let favorites = try? JSONDecoder().decode(Set<String>.self, from: data) {
            favoriteAppIds = favorites
        }
    }
    
    private func saveFavorites() {
        if let data = try? JSONEncoder().encode(favoriteAppIds) {
            UserDefaults.standard.set(data, forKey: "favoriteApps")
        }
    }
    
    private func removeFromFavorites(_ appId: String) {
        favoriteAppIds.remove(appId)
        saveFavorites()
    }
    
    private func clearAllFavorites() {
        favoriteAppIds.removeAll()
        saveFavorites()
    }
    
    // Public method to add favorites (can be called from other views)
    func addToFavorites(_ appId: String) {
        favoriteAppIds.insert(appId)
        saveFavorites()
    }
    
    func isInFavorites(_ appId: String) -> Bool {
        return favoriteAppIds.contains(appId)
    }
}

// MARK: - Empty Favorites View
struct EmptyFavoritesView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "heart")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Favorites Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Apps you favorite will appear here")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Text("Right-click on any app and select 'Add to Favorites' to start building your collection.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    FavoritesView(selectedApp: .constant(nil), showingAppDetail: .constant(false))
        .environmentObject(APIService())
} 