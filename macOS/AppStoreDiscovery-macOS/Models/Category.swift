//
//  Category.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import Foundation

struct Category: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let slug: String
    let created_at: String?
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