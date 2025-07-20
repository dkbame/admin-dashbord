//
//  AppModel.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
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
    let price: String?
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
    
    // Additional fields for Mac app
    let status: String?
    let currency: String?
    let minimum_os_version: String?
    let features: [String]?
    let source: String?
    
    // Computed properties for better UX
    var displayPrice: String {
        if let price = price, let priceValue = Double(price) {
            if priceValue == 0 {
                return "Free"
            } else {
                return "$\(String(format: "%.2f", priceValue))"
            }
        }
        return "Free"
    }
    
    var isFreeApp: Bool {
        return is_free == true || (price != nil && Double(price!) == 0)
    }
    
    var isPremiumApp: Bool {
        return !isFreeApp
    }
    
    var isActive: Bool {
        return status == "ACTIVE"
    }
    
    var hasRating: Bool {
        return rating != nil && rating! > 0
    }
    
    var hasScreenshots: Bool {
        return screenshots != nil && !screenshots!.isEmpty
    }
    
    var hasIcon: Bool {
        return icon_url != nil && !icon_url!.isEmpty
    }
    
    var formattedSize: String {
        guard let size = size else { return "Unknown" }
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(size))
    }
    
    var formattedReleaseDate: String {
        guard let releaseDate = release_date else { return "Unknown" }
        let formatter = Foundation.DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: releaseDate) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return releaseDate
    }
    
    var formattedLastUpdated: String {
        guard let lastUpdated = last_updated else { return "Unknown" }
        let formatter = Foundation.DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        if let date = formatter.date(from: lastUpdated) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return lastUpdated
    }
    
    var categoryName: String {
        // This will be populated by the API service
        return "Unknown"
    }
    
    var categorySlug: String {
        // This will be populated by the API service
        return "unknown"
    }
}

// MARK: - Preview Data
extension AppModel {
    static let preview = AppModel(
        id: "preview-1",
        name: "Sample App",
        description: "This is a sample app for preview purposes. It demonstrates how the app will look in the Mac interface.",
        developer: "Sample Developer",
        price: "0",
        category_id: "category-1",
        icon_url: nil,
        screenshots: [],
        app_store_url: "https://apps.apple.com",
        website_url: "https://example.com",
        version: "1.0.0",
        size: 52428800, // 50MB
        rating: 4.5,
        rating_count: 1234,
        release_date: "2025-01-15",
        last_updated: "2025-01-15T10:00:00Z",
        is_free: true,
        is_featured: true,
        created_at: "2025-01-15T10:00:00Z",
        updated_at: "2025-01-15T10:00:00Z",
        status: "ACTIVE",
        currency: "USD",
        minimum_os_version: "12.0",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        source: "MAS"
    )
} 