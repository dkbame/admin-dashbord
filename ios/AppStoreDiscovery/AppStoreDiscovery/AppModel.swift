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
    
    // Custom initializer to handle string-to-number conversions
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decode(String.self, forKey: .description)
        developer = try container.decodeIfPresent(String.self, forKey: .developer)
        price = try container.decodeIfPresent(String.self, forKey: .price)
        category_id = try container.decode(String.self, forKey: .category_id)
        icon_url = try container.decodeIfPresent(String.self, forKey: .icon_url)
        screenshots = try container.decodeIfPresent([Screenshot].self, forKey: .screenshots)
        app_store_url = try container.decodeIfPresent(String.self, forKey: .app_store_url)
        website_url = try container.decodeIfPresent(String.self, forKey: .website_url)
        version = try container.decodeIfPresent(String.self, forKey: .version)
        last_updated = try container.decodeIfPresent(String.self, forKey: .last_updated)
        is_free = try container.decodeIfPresent(Bool.self, forKey: .is_free)
        is_featured = try container.decodeIfPresent(Bool.self, forKey: .is_featured)
        created_at = try container.decodeIfPresent(String.self, forKey: .created_at)
        updated_at = try container.decodeIfPresent(String.self, forKey: .updated_at)
        release_date = try container.decodeIfPresent(String.self, forKey: .release_date)
        
        // Handle size field - try Int first, then String conversion
        if let sizeInt = try container.decodeIfPresent(Int.self, forKey: .size) {
            size = sizeInt
        } else if let sizeString = try container.decodeIfPresent(String.self, forKey: .size) {
            size = Int(sizeString)
        } else {
            size = nil
        }
        
        // Handle rating field - try Double first, then String conversion
        if let ratingDouble = try container.decodeIfPresent(Double.self, forKey: .rating) {
            rating = ratingDouble
        } else if let ratingString = try container.decodeIfPresent(String.self, forKey: .rating) {
            rating = Double(ratingString)
        } else {
            rating = nil
        }
        
        // Handle rating_count field - try Int first, then String conversion
        if let ratingCountInt = try container.decodeIfPresent(Int.self, forKey: .rating_count) {
            rating_count = ratingCountInt
        } else if let ratingCountString = try container.decodeIfPresent(String.self, forKey: .rating_count) {
            rating_count = Int(ratingCountString)
        } else {
            rating_count = nil
        }
    }
    
    // Manual initializer for creating AppModel instances
    init(id: String, name: String, description: String, developer: String?, price: String?, category_id: String, icon_url: String?, screenshots: [Screenshot]?, app_store_url: String?, website_url: String?, version: String?, size: Int?, rating: Double?, rating_count: Int?, release_date: String?, last_updated: String?, is_free: Bool?, is_featured: Bool?, created_at: String?, updated_at: String?) {
        self.id = id
        self.name = name
        self.description = description
        self.developer = developer
        self.price = price
        self.category_id = category_id
        self.icon_url = icon_url
        self.screenshots = screenshots
        self.app_store_url = app_store_url
        self.website_url = website_url
        self.version = version
        self.size = size
        self.rating = rating
        self.rating_count = rating_count
        self.release_date = release_date
        self.last_updated = last_updated
        self.is_free = is_free
        self.is_featured = is_featured
        self.created_at = created_at
        self.updated_at = updated_at
    }
} 