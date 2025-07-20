//
//  HorizontalAppCard.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Horizontal App Card
struct HorizontalAppCard: View {
    let app: AppModel
    
    var body: some View {
        NavigationLink(destination: AppDetailView(app: app)) {
            VStack(alignment: .leading, spacing: 12) {
                // App Icon
                if let iconUrl = app.icon_url, let url = URL(string: iconUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.gray.opacity(0.2))
                            .overlay(
                                Image(systemName: "app.badge")
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(width: 80, height: 80)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Image(systemName: "app.badge")
                                .foregroundColor(.gray)
                        )
                        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
                }
                
                // App Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .frame(width: 80)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .frame(width: 80)
                    }
                    
                    HStack {
                        if let rating = app.rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                    .font(.caption2)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        if let price = app.price {
                            Text(price == "0" ? "Free" : "$\(price)")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    price == "0" 
                                        ? Color.green.opacity(0.2)
                                        : Color.blue.opacity(0.2)
                                )
                                .foregroundColor(price == "0" ? .green : .blue)
                                .cornerRadius(6)
                        }
                    }
                }
            }
            .frame(width: 80)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 16) {
            HorizontalAppCard(app: AppModel.preview)
            HorizontalAppCard(app: AppModel.preview)
            HorizontalAppCard(app: AppModel.preview)
        }
        .padding()
    }
} 