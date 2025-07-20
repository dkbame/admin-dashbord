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
    let developer: String
    let description: String?
    let category: Category?
    let price: String?
    let currency: String?
    let isOnMas: Bool
    let masId: String?
    let masUrl: String?
    let downloadUrl: String?
    let websiteUrl: String?
    let iconUrl: String?
    let minimumOsVersion: String?
    let features: [String]?
    let status: String
    let isFeatured: Bool?
    let isFree: Bool?
    let hasInAppPurchases: Bool?
    let pricingModel: String?
    let inAppPurchaseSummary: String?
    let screenshots: [Screenshot]?
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, developer, description, category, price, currency
        case isOnMas = "is_on_mas"
        case masId = "mas_id"
        case masUrl = "mas_url"
        case downloadUrl = "download_url"
        case websiteUrl = "website_url"
        case iconUrl = "icon_url"
        case minimumOsVersion = "minimum_os_version"
        case features, status
        case isFeatured = "is_featured"
        case isFree = "is_free"
        case hasInAppPurchases = "has_in_app_purchases"
        case pricingModel = "pricing_model"
        case inAppPurchaseSummary = "in_app_purchase_summary"
        case screenshots
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // Computed properties for better UX
    var displayPrice: String {
        if let price = price, !price.isEmpty, price != "0" {
            return "$\(price)"
        } else {
            return "Free"
        }
    }
    
    var hasIAP: Bool {
        return hasInAppPurchases == true
    }
    
    var pricingDisplay: String {
        if hasIAP {
            return "Free - Offers In-App Purchases"
        } else {
            return displayPrice
        }
    }
}

struct InAppPurchase: Identifiable, Codable {
    let id: String
    let appId: String
    let name: String
    let description: String?
    let price: String
    let currency: String
    let purchaseType: String
    let duration: String?
    let masProductId: String?
    let displayOrder: Int
    let isFeatured: Bool
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case appId = "app_id"
        case name, description, price, currency
        case purchaseType = "purchase_type"
        case duration
        case masProductId = "mas_product_id"
        case displayOrder = "display_order"
        case isFeatured = "is_featured"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    var displayPrice: String {
        return "\(currency) \(price)"
    }
    
    var purchaseTypeDisplay: String {
        return purchaseType.replacingOccurrences(of: "_", with: " ").capitalized
    }
} 