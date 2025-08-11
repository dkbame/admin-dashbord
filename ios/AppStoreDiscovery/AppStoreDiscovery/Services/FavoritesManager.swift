//
//  FavoritesManager.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation
import SwiftUI

@MainActor
class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()
    
    @Published var favoriteApps: [AppModel] = []
    
    private let userDefaults = UserDefaults.standard
    private let favoritesKey = "favorite_apps"
    
    private init() {
        loadFavorites()
    }
    
    // MARK: - Public Methods
    
    func toggleFavorite(_ app: AppModel) {
        if isFavorite(app) {
            removeFavorite(app)
        } else {
            addFavorite(app)
        }
    }
    
    func isFavorite(_ app: AppModel) -> Bool {
        return favoriteApps.contains { $0.id == app.id }
    }
    
    func addFavorite(_ app: AppModel) {
        guard !isFavorite(app) else { return }
        favoriteApps.append(app)
        saveFavorites()
    }
    
    func removeFavorite(_ app: AppModel) {
        favoriteApps.removeAll { $0.id == app.id }
        saveFavorites()
    }
    
    func getFavoriteApps() -> [AppModel] {
        return favoriteApps
    }
    
    func clearAllFavorites() {
        favoriteApps.removeAll()
        saveFavorites()
    }
    
    // MARK: - Private Methods
    
    private func saveFavorites() {
        do {
            let data = try JSONEncoder().encode(favoriteApps)
            userDefaults.set(data, forKey: favoritesKey)
        } catch {
            print("[ERROR] Failed to save favorites: \(error)")
        }
    }
    
    private func loadFavorites() {
        guard let data = userDefaults.data(forKey: favoritesKey) else {
            favoriteApps = []
            return
        }
        
        do {
            let apps = try JSONDecoder().decode([AppModel].self, from: data)
            favoriteApps = apps
        } catch {
            print("[ERROR] Failed to load favorites: \(error)")
            favoriteApps = []
        }
    }
}
