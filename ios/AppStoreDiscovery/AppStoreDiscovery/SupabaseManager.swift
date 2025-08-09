//
//  SupabaseManager.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    let client: SupabaseClient
    
    // Network configuration
    private let timeoutInterval: TimeInterval = 30.0 // 30 seconds timeout
    private let maxRetries = 3
    private let retryDelay: TimeInterval = 2.0 // 2 seconds between retries

    private init() {
        let urlString = "https://fnpwgnlvjhtddovkeuch.supabase.co"
        guard let url = URL(string: urlString) else {
            fatalError("Invalid Supabase URL")
        }
        let key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHdnbmx2amh0ZGRvdmtldWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjY4MDgsImV4cCI6MjA2Nzk0MjgwOH0.rDZ90noOevLzHEWx-k9vJoDMb0IY1hTuKbM53h299gE"
        
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: key)
    }
    
    // MARK: - Retry Logic
    
    func executeWithRetry<T>(_ operation: @escaping () async throws -> T) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...maxRetries {
            do {
                print("[DEBUG] SupabaseManager - Attempt \(attempt)/\(maxRetries)")
                return try await operation()
            } catch {
                lastError = error
                print("[DEBUG] SupabaseManager - Attempt \(attempt) failed: \(error.localizedDescription)")
                
                if attempt < maxRetries {
                    print("[DEBUG] SupabaseManager - Retrying in \(retryDelay) seconds...")
                    try await Task.sleep(nanoseconds: UInt64(retryDelay * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? NSError(domain: "SupabaseManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Max retries exceeded"])
    }
    
    // MARK: - Optimized Query Methods for Fast Initial Loading
    
    // Fast initial load - apps without screenshots
    func fetchAppsFast(limit: Int = 30, offset: Int = 0) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .order("created_at", ascending: false)
                .range(from: offset, to: offset + limit - 1)
                .execute()
        }
    }
    
    // Fetch featured apps for home page
    func fetchFeaturedApps(limit: Int = 10) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("is_featured", value: true)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
        }
    }
    
    // Fetch top rated apps
    func fetchTopRatedApps(limit: Int = 10) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .not("rating", operator: .is, value: "null")
                .order("rating", ascending: false)
                .limit(limit)
                .execute()
        }
    }
    
    // Fetch free apps
    func fetchFreeApps(limit: Int = 10) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("is_free", value: true)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
        }
    }
    
    // Fetch paid apps
    func fetchPaidApps(limit: Int = 10) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("is_free", value: false)
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
        }
    }
    
    // MARK: - Enhanced Query Methods (Original)
    
    func fetchAppsWithRetry() async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .order("created_at", ascending: false)
                .execute()
        }
    }
    
    func fetchCategoriesWithRetry() async throws -> PostgrestResponse<[Category]> {
        return try await executeWithRetry {
            print("[DEBUG] SupabaseManager - Starting to fetch categories")
            let response: PostgrestResponse<[Category]> = try await self.client
                .from("categories")
                .select("*")
                .execute()
            print("[DEBUG] SupabaseManager - Categories response status: \(response.status)")
            print("[DEBUG] SupabaseManager - Categories response data length: \(response.data.count) bytes")
            return response
        }
    }
    
    func fetchScreenshotsWithRetry(appId: String) async throws -> PostgrestResponse<[Screenshot]> {
        return try await executeWithRetry {
            try await self.client
                .from("screenshots")
                .select("*")
                .eq("app_id", value: appId)
                .order("display_order")
                .execute()
        }
    }
    
    func fetchAppsByCategoryWithRetry(categoryId: String) async throws -> PostgrestResponse<[AppModel]> {
        return try await executeWithRetry {
            try await self.client
                .from("ios_apps_view")
                .select("*")
                .eq("status", value: "ACTIVE")
                .eq("category_id", value: categoryId)
                .order("created_at", ascending: false)
                .execute()
        }
    }
} 