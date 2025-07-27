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
    let size: String?
    let rating: Double?
    let rating_count: Int?
    let last_updated: String?
    let is_free: Bool?
    let is_featured: Bool?
    let created_at: String?
    let updated_at: String?
    
    // New fields for better integration
    let status: String?
    let currency: String?
    let minimum_os_version: String?
    let architecture: String?
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
        // If size is already in human-readable format (e.g., "97.4 MB"), return it as is
        if size.contains("MB") || size.contains("GB") || size.contains("KB") {
            return size
        }
        // Fallback: try to parse as integer and format
        if let sizeInt = Int(size) {
            let formatter = ByteCountFormatter()
            formatter.allowedUnits = [.useMB, .useGB]
            formatter.countStyle = .file
            return formatter.string(fromByteCount: Int64(sizeInt))
        }
        return size
    }
    

    
    var formattedLastUpdated: String {
        guard let lastUpdated = last_updated else { return "Unknown" }
        let formatter = Foundation.DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        if let date = formatter.date(from: lastUpdated) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return lastUpdated
    }
    
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
        status = try container.decodeIfPresent(String.self, forKey: .status)
        currency = try container.decodeIfPresent(String.self, forKey: .currency)
        minimum_os_version = try container.decodeIfPresent(String.self, forKey: .minimum_os_version)
        architecture = try container.decodeIfPresent(String.self, forKey: .architecture)
        features = try container.decodeIfPresent([String].self, forKey: .features)
        source = try container.decodeIfPresent(String.self, forKey: .source)
        
        // Handle size field with robust error handling
        var tempSize: String? = nil
        if container.contains(.size) {
            do {
                tempSize = try container.decode(String.self, forKey: .size)
            } catch {
                do {
                    let sizeInt = try container.decode(Int.self, forKey: .size)
                    // Convert integer to human-readable format
                    let formatter = ByteCountFormatter()
                    formatter.allowedUnits = [.useMB, .useGB]
                    formatter.countStyle = .file
                    tempSize = formatter.string(fromByteCount: Int64(sizeInt))
                } catch {
                    tempSize = nil
                }
            }
        }
        size = tempSize
        
        // Handle rating field with robust error handling
        var tempRating: Double? = nil
        if container.contains(.rating) {
            do {
                tempRating = try container.decode(Double.self, forKey: .rating)
            } catch {
                do {
                    let ratingString = try container.decode(String.self, forKey: .rating)
                    tempRating = Double(ratingString)
                } catch {
                    tempRating = nil
                }
            }
        }
        rating = tempRating
        
        // Handle rating_count field with robust error handling
        var tempRatingCount: Int? = nil
        if container.contains(.rating_count) {
            do {
                tempRatingCount = try container.decode(Int.self, forKey: .rating_count)
            } catch {
                do {
                    let ratingCountString = try container.decode(String.self, forKey: .rating_count)
                    tempRatingCount = Int(ratingCountString)
                } catch {
                    tempRatingCount = nil
                }
            }
        }
        rating_count = tempRatingCount
    }
    
    // Preview data for SwiftUI previews
    static let preview = AppModel(
        id: "preview-1",
        name: "Sample App",
        description: "This is a sample app for preview purposes. It demonstrates the app detail view with various features and information.",
        developer: "Sample Developer",
        price: "0",
        category_id: "1",
        icon_url: nil,
        screenshots: [
            Screenshot(id: "1", url: "https://example.com/screenshot1.jpg", caption: "Main screen", display_order: 1),
            Screenshot(id: "2", url: "https://example.com/screenshot2.jpg", caption: "Settings", display_order: 2)
        ],
        app_store_url: "https://apps.apple.com/app/sample",
        website_url: "https://example.com",
        version: "1.0.0",
        size: "50 MB",
        rating: 4.5,
        rating_count: 1234,
        last_updated: "2024-01-15T10:30:00.000000Z",
        is_free: true,
        is_featured: true,
        created_at: "2024-01-15T10:30:00.000000Z",
        updated_at: "2024-01-15T10:30:00.000000Z",
        status: "ACTIVE",
        currency: "USD",
        minimum_os_version: "iOS 14.0",
        architecture: "Universal",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        source: "manual"
    )
    
    // Manual initializer for creating AppModel instances
    init(id: String, name: String, description: String, developer: String?, price: String?, category_id: String, icon_url: String?, screenshots: [Screenshot]?, app_store_url: String?, website_url: String?, version: String?, size: String?, rating: Double?, rating_count: Int?, last_updated: String?, is_free: Bool?, is_featured: Bool?, created_at: String?, updated_at: String?, status: String?, currency: String?, minimum_os_version: String?, architecture: String?, features: [String]?, source: String?) {
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
        self.last_updated = last_updated
        self.is_free = is_free
        self.is_featured = is_featured
        self.created_at = created_at
        self.updated_at = updated_at
        self.status = status
        self.currency = currency
        self.minimum_os_version = minimum_os_version
        self.architecture = architecture
        self.features = features
        self.source = source
    }
} 