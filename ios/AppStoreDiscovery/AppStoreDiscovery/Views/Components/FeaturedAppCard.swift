//
//  FeaturedAppCard.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Enhanced Featured App Card
struct FeaturedAppCard: View {
    let app: AppModel
    let onTap: (() -> Void)?
    
    var body: some View {
        Button(action: {
            onTap?()
        }) {
            ZStack {
                // Background with app icon and screenshot tinted
                BackgroundLayeredView(app: app)
                
                // Content overlay
                VStack(alignment: .leading, spacing: 12) {
                    Spacer()
                    
                    // App Info
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            // App Icon
                            AppIconView(app: app, size: CGSize(width: 50, height: 50))
                                .cornerRadius(12)
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(app.name)
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .lineLimit(2)
                                    .foregroundColor(.white)
                                    .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                                
                                if let developer = app.developer {
                                    Text(developer)
                                        .font(.subheadline)
                                        .foregroundColor(.white.opacity(0.9))
                                        .shadow(color: .black.opacity(0.5), radius: 1, x: 0, y: 1)
                                }
                            }
                            
                            Spacer()
                            
                            // Price and Rating
                            VStack(alignment: .trailing, spacing: 4) {
                                PriceBadge(app: app, size: .medium)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(8)
                                
                                if let rating = app.rating {
                                    RatingView(rating: rating, size: .medium)
                                        .background(.ultraThinMaterial)
                                        .cornerRadius(8)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
            }
            .frame(width: 320, height: 200)
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.3), .clear],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Background Layered View
struct BackgroundLayeredView: View {
    let app: AppModel
    
    var body: some View {
        ZStack {
            // Primary background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.blue.opacity(0.8),
                    Color.purple.opacity(0.6),
                    Color.orange.opacity(0.4)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // App icon as large background element
            if let iconUrl = app.icon_url {
                AsyncImage(url: URL(string: iconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 200, height: 200)
                        .blur(radius: 20)
                        .opacity(0.3)
                        .scaleEffect(1.5)
                        .offset(x: 100, y: -50)
                } placeholder: {
                    Image(systemName: "app.badge")
                        .font(.system(size: 100))
                        .foregroundColor(.white.opacity(0.3))
                        .blur(radius: 10)
                        .offset(x: 100, y: -50)
                }
            }
            
            // Screenshot as background element - with better fallback
            if let screenshots = app.screenshots, !screenshots.isEmpty {
                let firstScreenshot = screenshots.first!
                AsyncImage(url: URL(string: firstScreenshot.url)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 150, height: 100)
                        .blur(radius: 15)
                        .opacity(0.4)
                        .scaleEffect(1.2)
                        .offset(x: -80, y: 60)
                        .rotationEffect(.degrees(-15))
                } placeholder: {
                    // Enhanced placeholder with app-themed content
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.white.opacity(0.2))
                        .frame(width: 150, height: 100)
                        .overlay(
                            VStack(spacing: 4) {
                                Image(systemName: "iphone")
                                    .foregroundColor(.white.opacity(0.7))
                                    .font(.system(size: 24))
                                Text(app.name.prefix(1).uppercased())
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white.opacity(0.8))
                            }
                        )
                        .blur(radius: 15)
                        .offset(x: -80, y: 60)
                        .rotationEffect(.degrees(-15))
                }
            } else {
                // Fallback when no screenshots available
                RoundedRectangle(cornerRadius: 8)
                    .fill(.white.opacity(0.2))
                    .frame(width: 150, height: 100)
                    .overlay(
                        VStack(spacing: 4) {
                            Image(systemName: "iphone.gen3")
                                .foregroundColor(.white.opacity(0.7))
                                .font(.system(size: 24))
                            Text(app.name.prefix(1).uppercased())
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    )
                    .blur(radius: 15)
                    .offset(x: -80, y: 60)
                    .rotationEffect(.degrees(-15))
            }
            
            // Additional decorative elements
            Circle()
                .fill(.white.opacity(0.1))
                .frame(width: 80, height: 80)
                .offset(x: -120, y: -80)
            
            Circle()
                .fill(.white.opacity(0.05))
                .frame(width: 120, height: 120)
                .offset(x: 140, y: 100)
            
            // Subtle pattern overlay
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.1),
                            .clear
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
        .clipped()
        .cornerRadius(20)
    }
}



#Preview {
    ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 16) {
            FeaturedAppCard(app: AppModel.preview, onTap: nil)
            FeaturedAppCard(app: AppModel.preview, onTap: nil)
            FeaturedAppCard(app: AppModel.preview, onTap: nil)
        }
        .padding()
    }
    .background(Color(.systemGroupedBackground))
} 