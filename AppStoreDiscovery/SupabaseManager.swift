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

    private init() {
        print("[DEBUG] SupabaseManager initializing...")
        let urlString = "https://fnpwgnlvjhtddovkeuch.supabase.co"
        guard let url = URL(string: urlString) else {
            print("[DEBUG] ERROR: Invalid Supabase URL")
            fatalError("Invalid Supabase URL")
        }
        let key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHdnbmx2amh0ZGRvdmtldWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjY4MDgsImV4cCI6MjA2Nzk0MjgwOH0.rDZ90noOevLzHEWx-k9vJoDMb0IY1hTuKbM53h299gE"
        print("[DEBUG] Supabase URL: \(urlString)")
        print("[DEBUG] Supabase Key: \(String(key.prefix(20)))...")
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: key)
        print("[DEBUG] SupabaseManager initialized successfully")
    }
} 