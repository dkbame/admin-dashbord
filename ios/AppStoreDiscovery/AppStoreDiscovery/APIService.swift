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
    
    // Optimized loading state
    @Published var isInitialLoading = false
    @Published var featuredApps: [AppModel] = []
    @Published var topRatedApps: [AppModel] = []
    @Published var freeApps: [AppModel] = []
    @Published var paidApps: [AppModel] = []
    @Published var recentlyAddedApps: [AppModel] = []
    
    // Screenshot cache to avoid re-fetching
    private var screenshotCache: [String: [Screenshot]] = [:]

    // MARK: - Optimized Fast Loading Methods
    
    func loadHomePageData() async {
        await MainActor.run {
            isInitialLoading = true
            errorMessage = nil
        }
        
        do {
            // Load all sections in parallel for faster initial load
            async let featuredTask = loadFeaturedApps()
            async let topRatedTask = loadTopRatedApps()
            async let freeTask = loadFreeApps()
            async let paidTask = loadPaidApps()
            async let recentTask = loadRecentlyAddedApps()
            async let categoriesTask = loadCategories()
            
            // Wait for all tasks to complete
            await (featuredTask, topRatedTask, freeTask, paidTask, recentTask, categoriesTask)
            
            await MainActor.run {
                self.isInitialLoading = false
            }
            
            print("[DEBUG] Home page data loaded successfully")
            
        } catch {
            print("[DEBUG] Error loading home page data: \(error)")
            await MainActor.run {
                self.errorMessage = "Error loading data: \(error.localizedDescription)"
                self.isInitialLoading = false
            }
        }
    }
    

    
    // MARK: - Individual Section Loading Methods (for View All pages)
    
    func loadFeaturedApps() async {
        do {
            let response = try await SupabaseManager.shared.fetchFeaturedApps(limit: 50)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            await MainActor.run {
                self.featuredApps = apps
            }
        } catch {
            print("[DEBUG] Error loading featured apps: \(error)")
        }
    }
    
    func loadTopRatedApps() async {
        do {
            let response = try await SupabaseManager.shared.fetchTopRatedApps(limit: 50)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            await MainActor.run {
                self.topRatedApps = apps
            }
        } catch {
            print("[DEBUG] Error loading top rated apps: \(error)")
        }
    }
    
    func loadFreeApps() async {
        do {
            let response = try await SupabaseManager.shared.fetchFreeApps(limit: 50)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            await MainActor.run {
                self.freeApps = apps
            }
        } catch {
            print("[DEBUG] Error loading free apps: \(error)")
        }
    }
    
    func loadPaidApps() async {
        do {
            let response = try await SupabaseManager.shared.fetchPaidApps(limit: 50)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            await MainActor.run {
                self.paidApps = apps
            }
        } catch {
            print("[DEBUG] Error loading paid apps: \(error)")
        }
    }
    
    func loadRecentlyAddedApps() async {
        do {
            let response = try await SupabaseManager.shared.fetchAppsFast(limit: 50)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            await MainActor.run {
                self.recentlyAddedApps = apps
            }
        } catch {
            print("[DEBUG] Error loading recently added apps: \(error)")
        }
    }
    
    private func loadCategories() async -> [Category] {
        do {
            print("[DEBUG] loadCategories - Starting to load categories")
            let response = try await SupabaseManager.shared.fetchCategoriesWithRetry()
            print("[DEBUG] loadCategories - Response status: \(response.status)")
            print("[DEBUG] loadCategories - Response data length: \(response.data.count) bytes")
            
            let categories = try JSONDecoder().decode([Category].self, from: response.data)
            print("[DEBUG] loadCategories - Successfully decoded \(categories.count) categories")
            
            for (index, category) in categories.enumerated() {
                print("[DEBUG] loadCategories - Category \(index): \(category.name) (ID: \(category.id))")
            }
            
            return categories
        } catch {
            print("[DEBUG] loadCategories - Error loading categories: \(error)")
            return []
        }
    }
    
    // MARK: - Screenshot Loading (On-Demand)
    
    func loadScreenshotsForApp(_ app: AppModel) async -> [Screenshot] {
        // Check cache first
        if let cachedScreenshots = screenshotCache[app.id] {
            return cachedScreenshots
        }
        
        do {
            let response = try await SupabaseManager.shared.fetchScreenshotsWithRetry(appId: app.id)
            let screenshots = try JSONDecoder().decode([Screenshot].self, from: response.data)
            
            // Cache the screenshots
            await MainActor.run {
                self.screenshotCache[app.id] = screenshots
            }
            
            return screenshots
        } catch {
            print("[DEBUG] Error loading screenshots for \(app.name): \(error)")
            return []
        }
    }
    
    // MARK: - Category-Specific App Loading
    
    func fetchAppsByCategory(categoryId: String) async -> [AppModel] {
        do {
            let response = try await SupabaseManager.shared.fetchAppsByCategoryWithRetry(categoryId: categoryId)
            let apps = try JSONDecoder().decode([AppModel].self, from: response.data)
            return apps
        } catch {
            print("[DEBUG] Error loading apps for category \(categoryId): \(error)")
            return []
        }
    }

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
            
            // Use the enhanced retry method for better reliability
            let appsResponse = try await SupabaseManager.shared.fetchAppsWithRetry()
            
            print("[DEBUG] fetchApps - Apps response status: \(appsResponse.status)")
            
            if appsResponse.status == 200 {
                do {
                    let apps = try JSONDecoder().decode([AppModel].self, from: appsResponse.data)
                    
                    // Now fetch screenshots for each app with retry
                    var appsWithScreenshots: [AppModel] = []
                    
                    for app in apps {
                        let screenshotsResponse = try await SupabaseManager.shared.fetchScreenshotsWithRetry(appId: app.id)
                        
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
                                architecture: app.architecture,
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
                        print("[DEBUG] App \(index) rating: \(app.rating ?? 0)")
                        print("[DEBUG] App \(index) rating_count: \(app.rating_count ?? 0)")
                        print("[DEBUG] App \(index) is_free: \(app.is_free ?? false)")
                        if let screenshots = app.screenshots {
                            for (screenshotIndex, screenshot) in screenshots.enumerated() {
                                print("[DEBUG] Screenshot \(screenshotIndex): \(screenshot.url)")
                            }
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
        
        do {
            guard !Task.isCancelled else {
                print("[DEBUG] fetchCategories - Task cancelled before API call")
                return
            }
            
            let categoriesResponse = try await SupabaseManager.shared.fetchCategoriesWithRetry()
            
            print("[DEBUG] fetchCategories - Categories response status: \(categoriesResponse.status)")
            
            if categoriesResponse.status == 200 {
                do {
                    let categories = try JSONDecoder().decode([Category].self, from: categoriesResponse.data)
                    
                    print("[DEBUG] fetchCategories - Successfully decoded \(categories.count) categories")
                
                await MainActor.run {
                    self.categories = categories
                    self.cachedCategories = categories
                    self.isOffline = false
                    }
                } catch let decodingError {
                    print("[DEBUG] Categories JSON Decoding Error: \(decodingError)")
                    await MainActor.run {
                        self.errorMessage = "Categories Decoding Error: \(decodingError.localizedDescription)"
                        self.loadFromCache()
                    }
                }
            } else {
                let errorString = String(data: categoriesResponse.data, encoding: .utf8) ?? "Unknown error (status: \(categoriesResponse.status))"
                print("[DEBUG] fetchCategories - Error: \(errorString)")
                await MainActor.run {
                    self.errorMessage = "Categories Error: \(errorString)"
                    self.loadFromCache()
                }
            }
        } catch {
            print("[DEBUG] fetchCategories - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Categories Error: \(error.localizedDescription)"
                self.isOffline = true
                self.loadFromCache()
            }
        }
    }
    
    // MARK: - Cache Management
    
    private func loadFromCache() {
        if !cachedApps.isEmpty {
            self.apps = cachedApps
        }
        if !cachedCategories.isEmpty {
            self.categories = cachedCategories
        }
    }
    
    func clearCache() {
        cachedApps = []
        cachedCategories = []
        screenshotCache.removeAll()
        lastFetchTime = nil
    }
}

// MARK: - Category Stats Model
struct CategoryStats: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let app_count: Int
    let avg_rating: Double?
    let total_ratings: Int?
    let free_app_count: Int
    let featured_app_count: Int
}