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
    
    // Real-time subscriptions
    private var appsSubscription: RealtimeChannel?
    private var categoriesSubscription: RealtimeChannel?

    func fetchApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            // Use the optimized view for better performance
            let appsResponse = try await SupabaseManager.shared.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE") // Only fetch active apps
                .order("created_at", ascending: false)
                .execute()
            
            print("[DEBUG] fetchApps - Apps response status: \(appsResponse.status)")
            
            if appsResponse.status == 200 {
                do {
                    let apps = try JSONDecoder().decode([AppModel].self, from: appsResponse.data)
                    
                    // Now fetch screenshots for each app
                    var appsWithScreenshots: [AppModel] = []
                    
                    for app in apps {
                        let screenshotsResponse = try await SupabaseManager.shared.client
                            .from("screenshots")
                            .select("*")
                            .eq("app_id", value: app.id)
                            .order("display_order")
                            .execute()
                        
                        print("[DEBUG] Screenshots for app \(app.name) (ID: \(app.id)):")
                        print("[DEBUG] Screenshots response status: \(screenshotsResponse.status)")
                        
                        if screenshotsResponse.status == 200 {
                            let screenshots = try JSONDecoder().decode([Screenshot].self, from: screenshotsResponse.data)
                            print("[DEBUG] Found \(screenshots.count) screenshots for \(app.name)")
                            
                            // Create a new app model with screenshots
                            let appWithScreenshots = AppModel(
                                id: app.id,
                                name: app.name,
                                description: app.description,
                                developer: app.developer,
                                price: app.price,
                                category_id: app.category_id,
                                icon_url: app.icon_url,
                                screenshots: screenshots,
                                app_store_url: app.app_store_url,
                                website_url: app.website_url,
                                version: app.version,
                                size: app.size,
                                rating: app.rating,
                                rating_count: app.rating_count,
                                release_date: app.release_date,
                                last_updated: app.last_updated,
                                is_free: app.is_free,
                                is_featured: app.is_featured,
                                created_at: app.created_at,
                                updated_at: app.updated_at,
                                status: app.status,
                                currency: app.currency,
                                minimum_os_version: app.minimum_os_version,
                                features: app.features,
                                source: app.source
                            )
                            appsWithScreenshots.append(appWithScreenshots)
                        } else {
                            print("[DEBUG] Failed to fetch screenshots for \(app.name)")
                            appsWithScreenshots.append(app)
                        }
                    }
                    
                    // Debug: Check screenshots for each app
                    for (index, app) in appsWithScreenshots.enumerated() {
                        print("[DEBUG] App \(index): \(app.name)")
                        print("[DEBUG] App \(index) screenshots count: \(app.screenshots?.count ?? 0)")
                        if let screenshots = app.screenshots {
                            for (screenshotIndex, screenshot) in screenshots.enumerated() {
                                print("[DEBUG] Screenshot \(screenshotIndex): \(screenshot.url)")
                            }
                        }
                    }
                    
                    let finalApps = appsWithScreenshots
                    await MainActor.run {
                        self.apps = finalApps
                        self.isLoading = false
                        self.lastFetchTime = Date()
                    }
                } catch let decodingError {
                    print("[DEBUG] JSON Decoding Error: \(decodingError)")
                    if let decodingError = decodingError as? DecodingError {
                        switch decodingError {
                        case .keyNotFound(let key, let context):
                            print("[DEBUG] Missing key: \(key.stringValue) at path: \(context.codingPath)")
                        case .typeMismatch(let type, let context):
                            print("[DEBUG] Type mismatch: expected \(type) at path: \(context.codingPath)")
                        case .valueNotFound(let type, let context):
                            print("[DEBUG] Value not found: expected \(type) at path: \(context.codingPath)")
                        case .dataCorrupted(let context):
                            print("[DEBUG] Data corrupted at path: \(context.codingPath)")
                        @unknown default:
                            print("[DEBUG] Unknown decoding error")
                        }
                    }
                    await MainActor.run {
                        self.errorMessage = "Decoding Error: \(decodingError.localizedDescription)"
                        self.isLoading = false
                    }
                }
            } else {
                let errorString = String(data: appsResponse.data, encoding: .utf8) ?? "Unknown error (status: \(appsResponse.status))"
                print("[DEBUG] fetchApps - Error: \(errorString)")
                await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                    self.isLoading = false
                }
            }
        } catch {
            print("[DEBUG] fetchApps - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    func fetchCategories() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        do {
            let response = try await SupabaseManager.shared.client
                .from("categories")
                .select()
                .execute()
            
            // Debug: Print the raw response data from Supabase
            print("[DEBUG] fetchCategories - Raw response data:")
            print(String(data: response.data, encoding: .utf8) ?? "No data or not UTF-8")
            print("[DEBUG] fetchCategories - Status: \(response.status)")

            if response.status == 200 {
                let categories = try JSONDecoder().decode([Category].self, from: response.data)
            await MainActor.run {
                self.categories = categories
                self.isLoading = false
            }
            } else {
                let errorString = String(data: response.data, encoding: .utf8) ?? "Unknown error (status: \(response.status))"
                print("[DEBUG] fetchCategories - Error: \(errorString)")
            await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                self.isLoading = false
            }
            }
        } catch {
            print("[DEBUG] fetchCategories - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }
    
    // MARK: - Real-time Subscriptions
    
    func subscribeToRealTimeUpdates() {
        // Subscribe to apps changes
        appsSubscription = SupabaseManager.shared.client
            .channel("apps_changes")
            .on(
                .postgresChanges(
                    event: .all,
                    schema: "public",
                    table: "apps"
                )
            ) { [weak self] payload in
                print("[DEBUG] Real-time apps update: \(payload)")
                Task {
                    await self?.handleAppsUpdate(payload)
                }
            }
            .subscribe()
        
        // Subscribe to categories changes
        categoriesSubscription = SupabaseManager.shared.client
            .channel("categories_changes")
            .on(
                .postgresChanges(
                    event: .all,
                    schema: "public",
                    table: "categories"
                )
            ) { [weak self] payload in
                print("[DEBUG] Real-time categories update: \(payload)")
                Task {
                    await self?.handleCategoriesUpdate(payload)
                }
            }
            .subscribe()
    }
    
    func unsubscribeFromRealTimeUpdates() {
        appsSubscription?.unsubscribe()
        categoriesSubscription?.unsubscribe()
        appsSubscription = nil
        categoriesSubscription = nil
    }
    
    private func handleAppsUpdate(_ payload: RealtimePostgresChangesPayload) async {
        // Refresh apps data when changes occur
        await fetchApps()
    }
    
    private func handleCategoriesUpdate(_ payload: RealtimePostgresChangesPayload) async {
        // Refresh categories data when changes occur
        await fetchCategories()
    }
    
    // MARK: - New Methods for Better Integration
    
    func fetchTrendingApps() async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .rpc("get_trending_apps", params: ["limit_count": 10])
                .execute()
            
            if response.status == 200 {
                let trendingApps = try JSONDecoder().decode([AppModel].self, from: response.data)
                return trendingApps
            }
        } catch {
            print("[DEBUG] fetchTrendingApps - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    func fetchNewReleases() async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .rpc("get_new_releases", params: ["limit_count": 10])
                .execute()
            
            if response.status == 200 {
                let newReleases = try JSONDecoder().decode([AppModel].self, from: response.data)
                return newReleases
            }
        } catch {
            print("[DEBUG] fetchNewReleases - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    func fetchFeaturedApps() async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("is_featured", value: true)
                .order("created_at", ascending: false)
                .limit(10)
                .execute()
            
            if response.status == 200 {
                let featuredApps = try JSONDecoder().decode([AppModel].self, from: response.data)
                return featuredApps
            }
        } catch {
            print("[DEBUG] fetchFeaturedApps - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    func fetchAppsByCategory(categoryId: String) async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("category_id", value: categoryId)
                .order("created_at", ascending: false)
                .execute()
            
            if response.status == 200 {
                let categoryApps = try JSONDecoder().decode([AppModel].self, from: response.data)
                return categoryApps
            }
        } catch {
            print("[DEBUG] fetchAppsByCategory - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    func searchApps(query: String) async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .or("name.ilike.%\(query)%,description.ilike.%\(query)%,developer.ilike.%\(query)%")
                .order("created_at", ascending: false)
                .limit(50)
                .execute()
            
            if response.status == 200 {
                let searchResults = try JSONDecoder().decode([AppModel].self, from: response.data)
                return searchResults
            }
        } catch {
            print("[DEBUG] searchApps - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    // MARK: - Cache Management
    
    func shouldRefreshData() -> Bool {
        guard let lastFetch = lastFetchTime else { return true }
        return Date().timeIntervalSince(lastFetch) > cacheValidityDuration
    }
    
    func clearCache() {
        lastFetchTime = nil
        apps = []
        categories = []
    }
} 