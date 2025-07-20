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
    
    // New fields for better integration
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
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: releaseDate) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return releaseDate
    }
    
    var formattedLastUpdated: String {
        guard let lastUpdated = last_updated else { return "Unknown" }
        let formatter = DateFormatter()
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
        release_date = try container.decodeIfPresent(String.self, forKey: .release_date)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        currency = try container.decodeIfPresent(String.self, forKey: .currency)
        minimum_os_version = try container.decodeIfPresent(String.self, forKey: .minimum_os_version)
        features = try container.decodeIfPresent([String].self, forKey: .features)
        source = try container.decodeIfPresent(String.self, forKey: .source)
        
        // Handle size field with robust error handling
        var tempSize: Int? = nil
        if container.contains(.size) {
            do {
                tempSize = try container.decode(Int.self, forKey: .size)
            } catch {
                do {
                    let sizeString = try container.decode(String.self, forKey: .size)
                    tempSize = Int(sizeString)
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
    
    // Manual initializer for creating AppModel instances
    init(id: String, name: String, description: String, developer: String?, price: String?, category_id: String, icon_url: String?, screenshots: [Screenshot]?, app_store_url: String?, website_url: String?, version: String?, size: Int?, rating: Double?, rating_count: Int?, release_date: String?, last_updated: String?, is_free: Bool?, is_featured: Bool?, created_at: String?, updated_at: String?, status: String?, currency: String?, minimum_os_version: String?, features: [String]?, source: String?) {
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
        self.status = status
        self.currency = currency
        self.minimum_os_version = minimum_os_version
        self.features = features
        self.source = source
    }
} 