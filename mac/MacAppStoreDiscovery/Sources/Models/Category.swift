//
//  Category.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
//

import Foundation

struct Category: Identifiable, Codable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let created_at: String?
    let updated_at: String?
    
    // Computed properties
    var displayName: String {
        return name.isEmpty ? "Uncategorized" : name
    }
    
    var formattedCreatedDate: String {
        guard let createdDate = created_at else { return "Unknown" }
        let formatter = Foundation.DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        if let date = formatter.date(from: createdDate) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return createdDate
    }
}

// MARK: - Preview Data
extension Category {
    static let preview = Category(
        id: "preview-category-1",
        name: "Productivity",
        slug: "productivity",
        description: "Apps to help you get things done",
        created_at: "2025-01-15T10:00:00Z",
        updated_at: "2025-01-15T10:00:00Z"
    )
    
    static let previewCategories = [
        Category(id: "1", name: "Productivity", slug: "productivity", description: "Get things done", created_at: nil, updated_at: nil),
        Category(id: "2", name: "Developer Tools", slug: "developer-tools", description: "Tools for developers", created_at: nil, updated_at: nil),
        Category(id: "3", name: "Design", slug: "design", description: "Creative design tools", created_at: nil, updated_at: nil),
        Category(id: "4", name: "Entertainment", slug: "entertainment", description: "Fun and games", created_at: nil, updated_at: nil),
        Category(id: "5", name: "Utilities", slug: "utilities", description: "System utilities", created_at: nil, updated_at: nil)
    ]
} 