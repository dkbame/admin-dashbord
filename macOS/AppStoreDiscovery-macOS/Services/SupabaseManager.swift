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

    private init() {
        let urlString = "https://fnpwgnlvjhtddovkeuch.supabase.co"
        guard let url = URL(string: urlString) else {
            fatalError("Invalid Supabase URL")
        }
        let key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHdnbmx2amh0ZGRvdmtldWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjY4MDgsImV4cCI6MjA2Nzk0MjgwOH0.rDZ90noOevLzHEWx-k9vJoDMb0IY1hTuKbM53h299gE"
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: key)
    }
} 