//
//  APIService.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
//

import Foundation
import Combine

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
    
    // Supabase configuration
    private let supabaseURL = "https://your-project.supabase.co"
    private let supabaseKey = "your-anon-key"
    
    init() {
        // Load cached data on init
        loadCachedData()
    }
    
    // MARK: - App Fetching
    
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
            print("[DEBUG] fetchApps - Starting fetch")
            
            // Check if we have recent cached data
            if let lastFetch = lastFetchTime,
               Date().timeIntervalSince(lastFetch) < cacheValidityDuration,
               !cachedApps.isEmpty {
                await MainActor.run {
                    self.apps = self.cachedApps
                    self.isLoading = false
                }
                print("[DEBUG] fetchApps - Using cached data")
                return
            }
            
            // Fetch from API
            let url = URL(string: "\(supabaseURL)/rest/v1/ios_apps_view?select=*")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            print("[DEBUG] fetchApps - Status: \(httpResponse.statusCode)")
            
            guard httpResponse.statusCode == 200 else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let fetchedApps = try JSONDecoder().decode([AppModel].self, from: data)
            
            await MainActor.run {
                self.apps = fetchedApps
                self.cachedApps = fetchedApps
                self.lastFetchTime = Date()
                self.isLoading = false
                self.isOffline = false
            }
            
            // Save to cache
            saveCachedData()
            
            print("[DEBUG] fetchApps - Successfully fetched \(fetchedApps.count) apps")
            
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
                self.isOffline = true
            }
            print("[DEBUG] fetchApps - Exception: \(error)")
        }
    }
    
    // MARK: - Category Fetching
    
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
            print("[DEBUG] fetchCategories - Starting fetch")
            
            let url = URL(string: "\(supabaseURL)/rest/v1/categories?select=*&order=name.asc")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            print("[DEBUG] fetchCategories - Status: \(httpResponse.statusCode)")
            
            guard httpResponse.statusCode == 200 else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let fetchedCategories = try JSONDecoder().decode([Category].self, from: data)
            
            await MainActor.run {
                self.categories = fetchedCategories
                self.cachedCategories = fetchedCategories
            }
            
            print("[DEBUG] fetchCategories - Successfully fetched \(fetchedCategories.count) categories")
            
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
            print("[DEBUG] fetchCategories - Exception: \(error)")
        }
    }
    
    // MARK: - Search
    
    func searchApps(query: String) async -> [AppModel] {
        guard !query.isEmpty else { return apps }
        
        do {
            let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            let url = URL(string: "\(supabaseURL)/rest/v1/ios_apps_view?select=*&or=(name.ilike.*\(encodedQuery)*,description.ilike.*\(encodedQuery)*,developer.ilike.*\(encodedQuery)*)")!
            
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return []
            }
            
            return try JSONDecoder().decode([AppModel].self, from: data)
            
        } catch {
            print("[DEBUG] searchApps - Error: \(error)")
            return []
        }
    }
    
    // MARK: - Caching
    
    private func saveCachedData() {
        // Save to UserDefaults for persistence
        if let encoded = try? JSONEncoder().encode(cachedApps) {
            UserDefaults.standard.set(encoded, forKey: "cached_apps")
        }
        if let encoded = try? JSONEncoder().encode(cachedCategories) {
            UserDefaults.standard.set(encoded, forKey: "cached_categories")
        }
        UserDefaults.standard.set(lastFetchTime, forKey: "last_fetch_time")
    }
    
    private func loadCachedData() {
        // Load from UserDefaults
        if let data = UserDefaults.standard.data(forKey: "cached_apps"),
           let decoded = try? JSONDecoder().decode([AppModel].self, from: data) {
            cachedApps = decoded
            apps = decoded
        }
        
        if let data = UserDefaults.standard.data(forKey: "cached_categories"),
           let decoded = try? JSONDecoder().decode([Category].self, from: data) {
            cachedCategories = decoded
            categories = decoded
        }
        
        lastFetchTime = UserDefaults.standard.object(forKey: "last_fetch_time") as? Date
    }
    
    // MARK: - Refresh
    
    func refreshData() async {
        lastFetchTime = nil // Force refresh
        await fetchApps()
        await fetchCategories()
    }
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidResponse
    case serverError(Int)
    case networkError
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code):
            return "Server error: \(code)"
        case .networkError:
            return "Network connection error"
        case .decodingError:
            return "Error processing data"
        }
    }
} 