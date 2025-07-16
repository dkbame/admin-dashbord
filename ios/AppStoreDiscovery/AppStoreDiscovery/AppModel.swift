//
//  AppModel.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation

struct Screenshot: Codable, Identifiable {
    let id: String
    let url: String
    let caption: String?
    let display_order: Int?
}

struct AppModel: Identifiable, Codable {
    let id: String
    let name: String
    let description: String
    let developer: String?
    let price: String? // Changed from Double? to String? to match Supabase data
    let category_id: String
    let icon_url: String?
    let screenshots: [Screenshot]?
    let app_store_url: String?
    let website_url: String?
    let version: String?
    let size: Int?
    let rating: Double?
    let rating_count: Int?
    let release_date: String?
    let last_updated: String?
    let is_free: Bool?
    let is_featured: Bool?
    let created_at: String?
    let updated_at: String?
} 