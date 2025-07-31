//
//  SupabaseManager.swift
//  AppStoreDiscovery-macOS
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
    
    // MARK: - Enhanced Query Methods
    
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
            try await self.client
                .from("categories")
                .select()
                .execute()
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