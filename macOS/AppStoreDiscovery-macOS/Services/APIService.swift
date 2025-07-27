//
//  APIService.swift
//  AppStoreDiscovery-macOS
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
    @Published var isOffline = false
    
    // Cache for better performance
    private var lastFetchTime: Date?
    private let cacheValidityDuration: TimeInterval = 300 // 5 minutes
    
    // Enhanced caching
    private var cachedApps: [AppModel] = []
    private var cachedCategories: [Category] = []
    
    // Task management to prevent cancellations
    private var currentAppsTask: Task<Void, Never>?
    private var currentCategoriesTask: Task<Void, Never>?

    // MARK: - Enhanced App Fetching with Optimized Functions
    
    func fetchApps() async {
        // Cancel any existing task
        currentAppsTask?.cancel()
        
        currentAppsTask = Task {
            await performFetchApps()
        }
        
        await currentAppsTask?.value
    }
    
    private func performFetchApps() async {
        guard !Task.isCancelled else {
            print("[DEBUG] fetchApps - Task was cancelled before starting")
            return
        }
        
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            guard !Task.isCancelled else {
                print("[DEBUG] fetchApps - Task cancelled before API call")
                await MainActor.run { isLoading = false }
                return
            }
            
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
                    
                    let finalApps = appsWithScreenshots
                    await MainActor.run {
                        self.apps = finalApps
                        self.cachedApps = finalApps
                        self.isLoading = false
                        self.lastFetchTime = Date()
                        self.isOffline = false
                    }
                } catch let decodingError {
                    print("[DEBUG] JSON Decoding Error: \(decodingError)")
                    await MainActor.run {
                        self.errorMessage = "Decoding Error: \(decodingError.localizedDescription)"
                        self.isLoading = false
                        self.loadFromCache()
                    }
                }
            } else {
                let errorString = String(data: appsResponse.data, encoding: .utf8) ?? "Unknown error (status: \(appsResponse.status))"
                print("[DEBUG] fetchApps - Error: \(errorString)")
                await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                    self.isLoading = false
                    self.loadFromCache()
                }
            }
        } catch {
            print("[DEBUG] fetchApps - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
                self.isOffline = true
                self.loadFromCache()
            }
        }
    }

    func fetchCategories() async {
        // Cancel any existing task
        currentCategoriesTask?.cancel()
        
        currentCategoriesTask = Task {
            await performFetchCategories()
        }
        
        await currentCategoriesTask?.value
    }
    
    private func performFetchCategories() async {
        guard !Task.isCancelled else {
            print("[DEBUG] fetchCategories - Task was cancelled before starting")
            return
        }
        
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            guard !Task.isCancelled else {
                print("[DEBUG] fetchCategories - Task cancelled before API call")
                await MainActor.run { isLoading = false }
                return
            }
            
            let response = try await SupabaseManager.shared.client
                .from("categories")
                .select()
                .execute()
            
            guard !Task.isCancelled else {
                print("[DEBUG] fetchCategories - Task cancelled after API call")
                await MainActor.run { isLoading = false }
                return
            }
            
            print("[DEBUG] fetchCategories - Status: \(response.status)")

            if response.status == 200 {
                let categories = try JSONDecoder().decode([Category].self, from: response.data)
                
                guard !Task.isCancelled else {
                    print("[DEBUG] fetchCategories - Task cancelled before updating UI")
                    return
                }
                
                await MainActor.run {
                    self.categories = categories
                    self.cachedCategories = categories
                    self.isLoading = false
                    self.isOffline = false
                }
            } else {
                let errorString = String(data: response.data, encoding: .utf8) ?? "Unknown error (status: \(response.status))"
                print("[DEBUG] fetchCategories - Error: \(errorString)")
                await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                    self.isLoading = false
                    self.loadFromCache()
                }
            }
        } catch {
            guard !Task.isCancelled else {
                print("[DEBUG] fetchCategories - Task cancelled during exception handling")
                return
            }
            
            print("[DEBUG] fetchCategories - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
                self.isOffline = true
                self.loadFromCache()
            }
        }
    }
    
    // MARK: - Enhanced Methods Using New Database Functions
    
    func fetchTrendingApps() async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .rpc("get_trending_apps")
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
                .rpc("get_new_releases")
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
                .from("featured_apps_view")
                .select("*")
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
    
    func fetchFreeApps() async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.client
                .from("free_apps_view")
                .select("*")
                .execute()
            
            if response.status == 200 {
                let freeApps = try JSONDecoder().decode([AppModel].self, from: response.data)
                return freeApps
            }
        } catch {
            print("[DEBUG] fetchFreeApps - Error: \(error.localizedDescription)")
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
                .limit(20)
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
    
    func fetchCategoryStats() async -> [CategoryStats] {
        do {
            let response = try await SupabaseManager.shared.client
                .from("category_stats_view")
                .select("*")
                .execute()
            
            if response.status == 200 {
                let stats = try JSONDecoder().decode([CategoryStats].self, from: response.data)
                return stats
            }
        } catch {
            print("[DEBUG] fetchCategoryStats - Error: \(error.localizedDescription)")
        }
        return []
    }
    
    // MARK: - Offline Support
    
    private func loadFromCache() {
        if !cachedApps.isEmpty {
            self.apps = cachedApps
        }
        if !cachedCategories.isEmpty {
            self.categories = cachedCategories
        }
    }
    
    func refreshData() async {
        await fetchApps()
        await fetchCategories()
    }
} 