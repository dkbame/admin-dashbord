//
//  AppCard.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct AppCard: View {
    let app: AppModel
    let size: AppCardSize
    let showRating: Bool
    let onTap: (() -> Void)?
    @StateObject private var favoritesManager = FavoritesManager.shared
    
    init(
        app: AppModel,
        size: AppCardSize = .medium,
        showRating: Bool = true,
        onTap: (() -> Void)? = nil
    ) {
        self.app = app
        self.size = size
        self.showRating = showRating
        self.onTap = onTap
    }
    
    var body: some View {
        Group {
            if let onTap = onTap {
                Button(action: onTap) {
                    cardContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                cardContent
            }
        }
    }
    
    private var cardContent: some View {
        VStack(alignment: .leading, spacing: size.spacing) {
            // App Icon and Favorite Button
            ZStack(alignment: .topTrailing) {
                AppIconView(app: app, size: size.iconSize)
                
                // Favorite Button
                Button(action: {
                    favoritesManager.toggleFavorite(app)
                }) {
                    Image(systemName: favoritesManager.isFavorite(app) ? "heart.fill" : "heart")
                        .foregroundColor(favoritesManager.isFavorite(app) ? .red : .gray)
                        .font(.caption)
                        .padding(4)
                        .background(Color(.systemBackground))
                        .clipShape(Circle())
                        .shadow(radius: 1)
                }
                .offset(x: 4, y: -4)
            }
            
            // App Info
            VStack(alignment: .leading, spacing: size.infoSpacing) {
                Text(app.name)
                    .font(size.titleFont)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(size.titleLineLimit)
                
                if let developer = app.developer {
                    Text(developer)
                        .font(size.subtitleFont)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                HStack {
                    PriceBadge(app: app, size: size)
                    
                    if showRating, let rating = app.rating {
                        Spacer()
                        RatingView(rating: rating, size: size)
                    } else {
                        // Debug logging to understand why ratings aren't showing
                        if showRating {
                            // Rating is expected to show but app.rating is nil
                            // You can add debug print here if needed
                            // print("DEBUG: App \(app.name) - showRating: \(showRating), rating: \(app.rating)")
                        }
                    }
                }
            }
        }
        .frame(width: size.width)
    }
}

// MARK: - App Icon View
struct AppIconView: View {
    let app: AppModel
    let size: CGSize
    
    var body: some View {
        if let iconUrl = app.icon_url {
            AsyncImage(url: URL(string: iconUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                RoundedRectangle(cornerRadius: size.width * 0.2)
                    .fill(Color.gray.opacity(0.3))
            }
            .frame(width: size.width, height: size.height)
            .cornerRadius(size.width * 0.2)
        } else {
            RoundedRectangle(cornerRadius: size.width * 0.2)
                .fill(Color.gray.opacity(0.3))
                .frame(width: size.width, height: size.height)
                .overlay(
                    Text(app.name.prefix(1).uppercased())
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.gray)
                )
        }
    }
}

// MARK: - Price Badge
struct PriceBadge: View {
    let app: AppModel
    let size: AppCardSize
    
    var body: some View {
        if app.is_free == true {
            Text("Free")
                .font(size.priceFont)
                .padding(.horizontal, size.pricePadding)
                .padding(.vertical, size.pricePadding / 2)
                .background(Color.green.opacity(0.2))
                .foregroundColor(.green)
                .cornerRadius(size.priceCornerRadius)
        } else {
            Text("$\(app.price ?? "0")")
                .font(size.priceFont)
                .padding(.horizontal, size.pricePadding)
                .padding(.vertical, size.pricePadding / 2)
                .background(Color.blue.opacity(0.2))
                .foregroundColor(.blue)
                .cornerRadius(size.priceCornerRadius)
        }
    }
}

// MARK: - Rating View
struct RatingView: View {
    let rating: Double
    let size: AppCardSize
    
    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "star.fill")
                .foregroundColor(.yellow)
                .font(size.ratingFont)
            Text(String(format: "%.1f", rating))
                .font(size.ratingFont)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - App Card Size
enum AppCardSize {
    case small
    case medium
    case large
    
    var width: CGFloat {
        switch self {
        case .small: return 100
        case .medium: return 120
        case .large: return 150
        }
    }
    
    var iconSize: CGSize {
        switch self {
        case .small: return CGSize(width: 60, height: 60)
        case .medium: return CGSize(width: 80, height: 80)
        case .large: return CGSize(width: 100, height: 100)
        }
    }
    
    var spacing: CGFloat {
        switch self {
        case .small: return 6
        case .medium: return 8
        case .large: return 12
        }
    }
    
    var infoSpacing: CGFloat {
        switch self {
        case .small: return 2
        case .medium: return 4
        case .large: return 6
        }
    }
    
    var titleFont: Font {
        switch self {
        case .small: return .caption
        case .medium: return .subheadline
        case .large: return .headline
        }
    }
    
    var subtitleFont: Font {
        switch self {
        case .small: return .caption2
        case .medium: return .caption
        case .large: return .subheadline
        }
    }
    
    var titleLineLimit: Int {
        switch self {
        case .small: return 1
        case .medium: return 2
        case .large: return 2
        }
    }
    
    var priceFont: Font {
        switch self {
        case .small: return .caption2
        case .medium: return .caption
        case .large: return .subheadline
        }
    }
    
    var pricePadding: CGFloat {
        switch self {
        case .small: return 4
        case .medium: return 6
        case .large: return 8
        }
    }
    
    var priceCornerRadius: CGFloat {
        switch self {
        case .small: return 4
        case .medium: return 6
        case .large: return 8
        }
    }
    
    var ratingFont: Font {
        switch self {
        case .small: return .caption2
        case .medium: return .caption
        case .large: return .subheadline
        }
    }
}

// MARK: - App Card Variants
struct FeaturedAppCard: View {
    let app: AppModel
    let onTap: (() -> Void)?
    @StateObject private var favoritesManager = FavoritesManager.shared
    
    var body: some View {
        Group {
            if let onTap = onTap {
                Button(action: onTap) {
                    featuredCardContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                featuredCardContent
            }
        }
    }
    
    private var featuredCardContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Screenshot or Icon with Favorite Button
            ZStack(alignment: .topTrailing) {
                if let firstScreenshot = app.screenshots?.first {
                    HighResCardImage(url: firstScreenshot.url, size: CGSize(width: 280, height: 160))
                } else {
                    AppIconView(app: app, size: CGSize(width: 280, height: 160))
                }
                
                // Favorite Button
                Button(action: {
                    favoritesManager.toggleFavorite(app)
                }) {
                    Image(systemName: favoritesManager.isFavorite(app) ? "heart.fill" : "heart")
                        .foregroundColor(favoritesManager.isFavorite(app) ? .red : .white)
                        .font(.title3)
                        .padding(8)
                        .background(Color.black.opacity(0.3))
                        .clipShape(Circle())
                }
                .offset(x: -8, y: 8)
            }
            
            // App Info
            VStack(alignment: .leading, spacing: 4) {
                Text(app.name)
                    .font(.headline)
                    .lineLimit(2)
                    .foregroundColor(.primary)
                
                if let developer = app.developer {
                    Text(developer)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    PriceBadge(app: app, size: .large)
                    
                    Spacer()
                    
                    if let rating = app.rating {
                        RatingView(rating: rating, size: .large)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
}

struct CompactAppCard: View {
    let app: AppModel
    let onTap: (() -> Void)?
    @StateObject private var favoritesManager = FavoritesManager.shared
    
    var body: some View {
        Group {
            if let onTap = onTap {
                Button(action: onTap) {
                    compactCardContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                compactCardContent
            }
        }
    }
    
    private var compactCardContent: some View {
        HStack(spacing: 12) {
            AppIconView(app: app, size: CGSize(width: 50, height: 50))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(app.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                    .foregroundColor(.primary)
                
                if let developer = app.developer {
                    Text(developer)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            PriceBadge(app: app, size: .small)
            
            // Favorite Button
            Button(action: {
                favoritesManager.toggleFavorite(app)
            }) {
                Image(systemName: favoritesManager.isFavorite(app) ? "heart.fill" : "heart")
                    .foregroundColor(favoritesManager.isFavorite(app) ? .red : .gray)
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview("AppCard") {
    VStack(spacing: 20) {
        AppCard(app: AppModel.preview, size: .small)
        AppCard(app: AppModel.preview, size: .medium)
        AppCard(app: AppModel.preview, size: .large)
        FeaturedAppCard(app: AppModel.preview, onTap: nil)
        CompactAppCard(app: AppModel.preview, onTap: nil)
    }
    .padding()
}

 