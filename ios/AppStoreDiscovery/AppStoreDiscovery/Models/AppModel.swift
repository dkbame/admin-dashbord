import Foundation

struct AppModel: Identifiable, Codable, Equatable {
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
    
    // Preview property for SwiftUI previews
    static let preview = AppModel(
        id: "preview-1",
        name: "Sample App",
        description: "This is a sample app for preview purposes",
        developer: "Sample Developer",
        price: "0.00",
        category_id: "sample-category",
        icon_url: nil,
        screenshots: nil,
        app_store_url: nil,
        website_url: nil,
        version: "1.0.0",
        size: "50 MB",
        rating: 4.5,
        rating_count: 100,
        last_updated: "2024-01-01T00:00:00.000000Z",
        is_free: true,
        is_featured: false,
        created_at: "2024-01-01T00:00:00.000000Z",
        updated_at: "2024-01-01T00:00:00.000000Z",
        status: "ACTIVE",
        currency: "USD",
        minimum_os_version: "15.0",
        architecture: "arm64",
        features: ["Feature 1", "Feature 2"],
        source: "preview"
    )
    
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
            formatter.allowedUnits = [ByteCountFormatter.Units.useMB, ByteCountFormatter.Units.useGB]
            formatter.countStyle = ByteCountFormatter.CountStyle.file
            return formatter.string(fromByteCount: Int64(sizeInt))
        }
        return size
    }
    
    // Equatable conformance for favorites management
    static func == (lhs: AppModel, rhs: AppModel) -> Bool {
        return lhs.id == rhs.id
    }
    
    var formattedLastUpdated: String {
        guard let lastUpdated = last_updated else { return "Unknown" }
        // For now, just return the raw date string to avoid DateFormatter issues
        return lastUpdated
    }
}
