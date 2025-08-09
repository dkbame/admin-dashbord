//
//  Formatters.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation

// MARK: - String Extension for Regex
extension String {
    func matches(pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return false
        }
        let range = NSRange(location: 0, length: self.count)
        return regex.firstMatch(in: self, options: [], range: range) != nil
    }
}

// MARK: - Date Formatter
struct DateFormatter {
    static let shared = DateFormatter()
    
    private let dateFormatter = Foundation.DateFormatter()
    
    func formatDate(_ dateString: String?, style: Foundation.DateFormatter.Style = .medium) -> String {
        guard let dateString = dateString else { return "Unknown" }
        
        // Try ISO format first
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        if let date = dateFormatter.date(from: dateString) {
            dateFormatter.dateStyle = style
            dateFormatter.timeStyle = .none
            return dateFormatter.string(from: date)
        }
        
        // Try simple date format
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let date = dateFormatter.date(from: dateString) {
            dateFormatter.dateStyle = style
            dateFormatter.timeStyle = .none
            return dateFormatter.string(from: date)
        }
        
        return dateString
    }
    
    func formatRelativeDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "Unknown" }
        
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        guard let date = dateFormatter.date(from: dateString) else {
            return formatDate(dateString)
        }
        
        let now = Date()
        
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: now)
    }
}

// MARK: - File Size Formatter
struct FileSizeFormatter {
    static func formatFileSize(_ size: String?) -> String {
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
    
    static func formatFileSizeDetailed(_ size: String?) -> String {
        guard let size = size else { return "Unknown" }
        
        // If size is already in human-readable format, return it as is
        if size.contains("MB") || size.contains("GB") || size.contains("KB") {
            return size
        }
        
        // Fallback: try to parse as integer and format
        if let sizeInt = Int(size) {
            let formatter = ByteCountFormatter()
            formatter.allowedUnits = [.useKB, .useMB, .useGB]
            formatter.countStyle = .file
            return formatter.string(fromByteCount: Int64(sizeInt))
        }
        
        return size
    }
}

// MARK: - Price Formatter
struct PriceFormatter {
    static func formatPrice(_ price: String?, currency: String = "USD") -> String {
        guard let price = price, !price.isEmpty else { return "Free" }
        
        if price == "0" || price == "0.00" {
            return "Free"
        }
        
        // Try to format as currency
        if let priceValue = Double(price) {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = currency
            return formatter.string(from: NSNumber(value: priceValue)) ?? "$\(price)"
        }
        
        return "$\(price)"
    }
    
    static func formatPriceRange(_ minPrice: String?, maxPrice: String?, currency: String = "USD") -> String {
        let minFormatted = formatPrice(minPrice, currency: currency)
        let maxFormatted = formatPrice(maxPrice, currency: currency)
        
        if minFormatted == maxFormatted {
            return minFormatted
        }
        
        return "\(minFormatted) - \(maxFormatted)"
    }
}

// MARK: - Rating Formatter
struct RatingFormatter {
    static func formatRating(_ rating: Double?) -> String {
        guard let rating = rating else { return "No rating" }
        return String(format: "%.1f", rating)
    }
    
    static func formatRatingCount(_ count: Int?) -> String {
        guard let count = count else { return "" }
        
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        } else {
            return "\(count)"
        }
    }
    
    static func formatRatingWithCount(_ rating: Double?, count: Int?) -> String {
        let ratingText = formatRating(rating)
        let countText = formatRatingCount(count)
        
        if countText.isEmpty {
            return ratingText
        }
        
        return "\(ratingText) (\(countText))"
    }
}

// MARK: - Text Formatter
struct TextFormatter {
    static func truncateText(_ text: String, maxLength: Int, suffix: String = "...") -> String {
        guard text.count > maxLength else { return text }
        let truncated = String(text.prefix(maxLength))
        return truncated + suffix
    }
    
    static func capitalizeFirstLetter(_ text: String) -> String {
        guard !text.isEmpty else { return text }
        return text.prefix(1).uppercased() + text.dropFirst()
    }
    
    static func formatAppName(_ name: String) -> String {
        return capitalizeFirstLetter(name)
    }
    
    static func formatDeveloperName(_ name: String) -> String {
        return capitalizeFirstLetter(name)
    }
}

// MARK: - URL Formatter
struct URLFormatter {
    static func isValidURL(_ urlString: String?) -> Bool {
        guard let urlString = urlString, !urlString.isEmpty else { return false }
        return URL(string: urlString) != nil
    }
    
    static func formatURL(_ urlString: String?) -> String {
        guard let urlString = urlString, isValidURL(urlString) else { return "" }
        
        // Remove protocol if present
        if urlString.hasPrefix("http://") {
            return String(urlString.dropFirst(7))
        } else if urlString.hasPrefix("https://") {
            return String(urlString.dropFirst(8))
        }
        
        return urlString
    }
    
    static func getDomainFromURL(_ urlString: String?) -> String {
        guard let urlString = urlString,
              let url = URL(string: urlString),
              let host = url.host else { return "" }
        
        return host
    }
}

// MARK: - Version Formatter
struct VersionFormatter {
    static func formatVersion(_ version: String?) -> String {
        guard let version = version, !version.isEmpty else { return "Unknown" }
        return "v\(version)"
    }
    
    static func compareVersions(_ version1: String, _ version2: String) -> ComparisonResult {
        let components1 = version1.components(separatedBy: ".").compactMap { Int($0) }
        let components2 = version2.components(separatedBy: ".").compactMap { Int($0) }
        
        let maxLength = max(components1.count, components2.count)
        
        for i in 0..<maxLength {
            let value1 = i < components1.count ? components1[i] : 0
            let value2 = i < components2.count ? components2[i] : 0
            
            if value1 < value2 {
                return .orderedAscending
            } else if value1 > value2 {
                return .orderedDescending
            }
        }
        
        return .orderedSame
    }
}

// MARK: - Category Formatter
struct CategoryFormatter {
    static func formatCategoryName(_ name: String) -> String {
        return TextFormatter.capitalizeFirstLetter(name)
    }
    
    static func getCategoryIcon(_ categoryName: String) -> String {
        let lowercased = categoryName.lowercased()
        
        switch lowercased {
        case let name where name.contains("productivity"):
            return "briefcase.fill"
        case let name where name.contains("game"):
            return "gamecontroller.fill"
        case let name where name.contains("photo"), let name where name.contains("video"):
            return "camera.fill"
        case let name where name.contains("music"), let name where name.contains("audio"):
            return "music.note"
        case let name where name.contains("social"):
            return "person.2.fill"
        case let name where name.contains("education"):
            return "book.fill"
        case let name where name.contains("health"), let name where name.contains("fitness"):
            return "heart.fill"
        case let name where name.contains("finance"), let name where name.contains("business"):
            return "dollarsign.circle.fill"
        case let name where name.contains("travel"):
            return "airplane"
        case let name where name.contains("food"), let name where name.contains("recipe"):
            return "fork.knife"
        case let name where name.contains("weather"):
            return "cloud.fill"
        case let name where name.contains("news"):
            return "newspaper.fill"
        default:
            return "app.fill"
        }
    }
}

// MARK: - Status Formatter
struct StatusFormatter {
    static func formatStatus(_ status: String?) -> String {
        guard let status = status else { return "Unknown" }
        
        switch status.uppercased() {
        case "ACTIVE":
            return "Active"
        case "PENDING":
            return "Pending"
        case "INACTIVE":
            return "Inactive"
        case "DRAFT":
            return "Draft"
        default:
            return TextFormatter.capitalizeFirstLetter(status)
        }
    }
    
    static func getStatusColor(_ status: String?) -> String {
        guard let status = status else { return "gray" }
        
        switch status.uppercased() {
        case "ACTIVE":
            return "green"
        case "PENDING":
            return "orange"
        case "INACTIVE":
            return "red"
        case "DRAFT":
            return "gray"
        default:
            return "gray"
        }
    }
}

// MARK: - Minimum OS Formatter
struct MinimumOSFormatter {
    static func formatMinimumOS(_ osVersion: String?) -> String {
        guard let osVersion = osVersion, !osVersion.isEmpty else { return "Unknown" }
        
        // Common patterns for macOS versions
        let lowercased = osVersion.lowercased()
        
        // Handle macOS version numbers
        if lowercased.contains("macos") || lowercased.contains("os x") {
            // Extract version number and format nicely
            let versionPattern = try? NSRegularExpression(pattern: "(\\d+\\.\\d+)", options: [])
            if let match = versionPattern?.firstMatch(in: osVersion, options: [], range: NSRange(location: 0, length: osVersion.count)) {
                let versionRange = Range(match.range(at: 1), in: osVersion)!
                let version = String(osVersion[versionRange])
                return "macOS \(version)+"
            }
            return osVersion
        }
        
        // Handle iOS version numbers
        if lowercased.contains("ios") {
            let versionPattern = try? NSRegularExpression(pattern: "(\\d+\\.\\d+)", options: [])
            if let match = versionPattern?.firstMatch(in: osVersion, options: [], range: NSRange(location: 0, length: osVersion.count)) {
                let versionRange = Range(match.range(at: 1), in: osVersion)!
                let version = String(osVersion[versionRange])
                return "iOS \(version)+"
            }
            return osVersion
        }
        
        // Handle simple version numbers (assume macOS)
        if osVersion.matches(pattern: "^\\d+\\.\\d+$") {
            return "macOS \(osVersion)+"
        }
        
        // Return as-is if no pattern matches
        return osVersion
    }
    
    static func getOSIcon(_ osVersion: String?) -> String {
        guard let osVersion = osVersion else { return "questionmark.circle" }
        
        let lowercased = osVersion.lowercased()
        
        if lowercased.contains("macos") || lowercased.contains("os x") {
            return "desktopcomputer"
        } else if lowercased.contains("ios") {
            return "iphone"
        } else {
            return "laptopcomputer"
        }
    }
}

// MARK: - Source Formatter
struct SourceFormatter {
    static func formatSource(_ source: String?) -> String {
        guard let source = source else { return "Unknown" }
        
        switch source.uppercased() {
        case "MAS", "MAC_APP_STORE":
            return "Mac App Store"
        case "CUSTOM":
            return "Custom"
        case "IMPORTED":
            return "Imported"
        default:
            return TextFormatter.capitalizeFirstLetter(source)
        }
    }
    
    static func getSourceIcon(_ source: String?) -> String {
        guard let source = source else { return "questionmark.circle" }
        
        switch source.uppercased() {
        case "MAS", "MAC_APP_STORE":
            return "app.store"
        case "CUSTOM":
            return "plus.circle"
        case "IMPORTED":
            return "arrow.down.circle"
        default:
            return "questionmark.circle"
        }
    }
} 