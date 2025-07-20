//
//  APIService.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation
import Supabase

class APIService: ObservableObject {
    @Published var apps: [AppModel] = []
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Cache for better performance
    private var lastFetchTime: Date?
    private let cacheValidityDuration: TimeInterval = 300 // 5 minutes
    
    // Real-time subscriptions - Temporarily disabled
    // private var appsSubscription: RealtimeChannelV2?
    // private var categoriesSubscription: RealtimeChannelV2?

    func fetchApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let { data, error } = await SupabaseManager.shared.client
                .from("apps")
                .select("""
                    *,
                    category:categories!apps_category_id_fkey (
                        id,
                        name,
                        slug
                    ),
                    screenshots:screenshots!fk_app (
                        id,
                        url,
                        caption,
                        display_order
                    )
                """)
                .eq("status", "ACTIVE")
                .order("created_at", ascending: false)
            
            if let error = error {
                throw error
            }
            
            await MainActor.run {
                if let data = data {
                    do {
                        let apps = try data.map { try $0.decode(AppModel.self) }
                        self.apps = apps
                    } catch {
                        self.errorMessage = "Failed to decode apps: \(error.localizedDescription)"
                    }
                } else {
                    self.apps = []
                }
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
    
    func fetchInAppPurchases(for appId: String) async -> [InAppPurchase] {
        do {
            let { data, error } = await SupabaseManager.shared.client
                .from("in_app_purchases")
                .select("*")
                .eq("app_id", appId)
                .order("display_order")
            
            if let error = error {
                throw error
            }
            
            if let data = data {
                return try data.map { try $0.decode(InAppPurchase.self) }
            }
            
            return []
        } catch {
            print("Error fetching in-app purchases: \(error)")
            return []
        }
    }
    
    func fetchCategories() async {
        do {
            let { data, error } = await SupabaseManager.shared.client
                .from("categories")
                .select("*")
                .order("name")
            
            if let error = error {
                throw error
            }
            
            await MainActor.run {
                if let data = data {
                    do {
                        let categories = try data.map { try $0.decode(Category.self) }
                        self.categories = categories
                    } catch {
                        self.errorMessage = "Failed to decode categories: \(error.localizedDescription)"
                    }
                } else {
                    self.categories = []
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func fetchFeaturedApps() async -> [AppModel] {
        return apps.filter { $0.isFeatured == true }
    }
    
    func fetchFreeApps() async -> [AppModel] {
        return apps.filter { $0.isFree == true }
    }
    
    func fetchAppsByCategory(_ categoryId: String) async -> [AppModel] {
        return apps.filter { $0.category?.id == categoryId }
    }
    
    func searchApps(query: String) async -> [AppModel] {
        let lowercasedQuery = query.lowercased()
        return apps.filter { app in
            app.name.lowercased().contains(lowercasedQuery) ||
            app.developer.lowercased().contains(lowercasedQuery) ||
            (app.description?.lowercased().contains(lowercasedQuery) ?? false)
        }
    }
    
    // MARK: - Real-time Subscriptions (Temporarily disabled due to API changes)
    
    func subscribeToRealTimeUpdates() {
        // TODO: Re-implement with current Supabase Swift SDK API
        print("[DEBUG] Real-time subscriptions temporarily disabled")
    }
    
    func unsubscribeFromRealTimeUpdates() {
        // TODO: Re-implement with current Supabase Swift SDK API
        print("[DEBUG] Real-time unsubscriptions temporarily disabled")
    }
    
    private func handleAppsUpdate(_ payload: Any) async {
        // Refresh apps data when changes occur
        await fetchApps()
    }
    
    private func handleCategoriesUpdate(_ payload: Any) async {
        // Refresh categories data when changes occur
        await fetchCategories()
    }
} 