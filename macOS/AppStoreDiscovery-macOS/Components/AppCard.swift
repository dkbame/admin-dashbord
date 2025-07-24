//
//  AppCard.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct AppCard: View {
    let app: AppModel
    let style: CardStyle
    @State private var showingDetail = false
    @State private var hovering = false
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    @EnvironmentObject var apiService: APIService
    
    enum CardStyle {
        case standard
        case compact
        case featured
    }
    
    var body: some View {
        Group {
            switch style {
            case .standard:
                StandardAppCard(app: app, hovering: hovering, showingDetail: $showingDetail, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
            case .compact:
                CompactAppCard(app: app, hovering: hovering, showingDetail: $showingDetail, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
            case .featured:
                FeaturedAppCard(app: app, hovering: hovering, showingDetail: $showingDetail, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
            }
        }
        .onHover { isHovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                hovering = isHovering
            }
        }
        .sheet(isPresented: $showingDetail) {
            // Only used for non-NVIDIA systems
            AppDetailView(app: app)
                .onAppear {
                    print("🔍 AppCard: SHEET opened for app: \(app.name) - this should NOT happen on NVIDIA systems!")
                }
        }
    }
}

// MARK: - Standard App Card
struct StandardAppCard: View {
    let app: AppModel
    let hovering: Bool
    @Binding var showingDetail: Bool
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    @EnvironmentObject var apiService: APIService
    
    var body: some View {
        Button(action: { 
            print("🖱️ AppCard: User clicked on app: \(app.name)")
            let useSoftwareRendering = MetalCompatibility.shared.shouldUseSoftwareRendering
            print("🔧 AppCard: MetalCompatibility.shouldUseSoftwareRendering = \(useSoftwareRendering)")
            
            // Find the app with screenshots from the main apps array
            let appWithScreenshots = apiService.apps.first { $0.id == app.id } ?? app
            print("🔍 AppCard: Found app with screenshots: \(appWithScreenshots.screenshots?.count ?? 0) screenshots")
            
            // For NVIDIA systems, use navigation instead of sheets to avoid CoreImage Metal issues
            if useSoftwareRendering {
                print("🛡️ AppCard: NVIDIA detected - using NAVIGATION instead of sheet")
                selectedApp = appWithScreenshots
                showingAppDetail = true
                print("✅ AppCard: Set NAVIGATION for \(app.name) - selectedApp set, showingAppDetail = true")
            } else {
                // For non-NVIDIA systems, use sheet
                print("🔧 AppCard: Non-NVIDIA system - using SHEET presentation")
                showingDetail = true 
                print("✅ AppCard: Set showingDetail = true for \(app.name)")
            }
        }) {
            VStack(alignment: .leading, spacing: 12) {
                // App icon
                AsyncImageCompat(url: URL(string: app.icon_url ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.controlBackgroundColor))
                        .overlay(
                            Image(systemName: "app.dashed")
                                .font(.title)
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 64, height: 64)
                .cornerRadius(16)
                
                // App info
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.headline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack {
                        // Rating
                        if let rating = app.rating, rating > 0 {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .font(.caption)
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        // Price
                        Text(app.displayPrice)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(app.isFreeApp ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
                            .foregroundColor(app.isFreeApp ? .green : .blue)
                            .cornerRadius(8)
                    }
                }
                
                Spacer()
            }
            .padding()
            .frame(height: 160)
            .background(Color(.controlBackgroundColor))
            .cornerRadius(12)
            .scaleEffect(hovering ? 1.05 : 1.0)
            .shadow(color: .black.opacity(hovering ? 0.1 : 0.05), radius: hovering ? 8 : 4)
        }
        .buttonStyle(PlainButtonStyle())
        .contextMenu {
            Button("View Details") {
                showingDetail = true
            }
            
            if let websiteUrl = app.website_url, let url = URL(string: websiteUrl) {
                Button("Visit Website") {
                    NSWorkspace.shared.open(url)
                }
            }
            
            if let appStoreUrl = app.app_store_url, let url = URL(string: appStoreUrl) {
                Button("View in App Store") {
                    NSWorkspace.shared.open(url)
                }
            }
        }
    }
}

// MARK: - Compact App Card
struct CompactAppCard: View {
    let app: AppModel
    let hovering: Bool
    @Binding var showingDetail: Bool
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    @EnvironmentObject var apiService: APIService
    
    var body: some View {
        Button(action: { 
            print("🖱️ AppCard (Compact): User clicked on app: \(app.name)")
            let useSoftwareRendering = MetalCompatibility.shared.shouldUseSoftwareRendering
            print("🔧 AppCard (Compact): MetalCompatibility.shouldUseSoftwareRendering = \(useSoftwareRendering)")
            
            // Find the app with screenshots from the main apps array
            let appWithScreenshots = apiService.apps.first { $0.id == app.id } ?? app
            print("🔍 AppCard (Compact): Found app with screenshots: \(appWithScreenshots.screenshots?.count ?? 0) screenshots")
            
            // For NVIDIA systems, use navigation instead of sheets to avoid CoreImage Metal issues
            if useSoftwareRendering {
                print("🛡️ AppCard (Compact): NVIDIA detected - using NAVIGATION instead of sheet")
                selectedApp = appWithScreenshots
                showingAppDetail = true
                print("✅ AppCard (Compact): Set NAVIGATION for \(app.name) - selectedApp set, showingAppDetail = true")
            } else {
                // For non-NVIDIA systems, use sheet
                print("🔧 AppCard (Compact): Non-NVIDIA system - using SHEET presentation")
                showingDetail = true 
                print("✅ AppCard (Compact): Set showingDetail = true for \(app.name)")
            }
        }) {
            HStack(spacing: 12) {
                // App icon
                AsyncImageCompat(url: URL(string: app.icon_url ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.controlBackgroundColor))
                        .overlay(
                            Image(systemName: "app.dashed")
                                .font(.title2)
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 48, height: 48)
                .cornerRadius(12)
                
                // App info
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(1)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack {
                        if let rating = app.rating, rating > 0 {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        Text(app.displayPrice)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(app.isFreeApp ? .green : .blue)
                    }
                }
                
                Spacer()
            }
            .padding()
            .background(Color(.controlBackgroundColor))
            .cornerRadius(10)
            .scaleEffect(hovering ? 1.02 : 1.0)
            .shadow(color: .black.opacity(hovering ? 0.08 : 0.03), radius: hovering ? 6 : 3)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Featured App Card
struct FeaturedAppCard: View {
    let app: AppModel
    let hovering: Bool
    @Binding var showingDetail: Bool
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    var body: some View {
        Button(action: { 
            print("🖱️ AppCard (Featured): User clicked on app: \(app.name)")
            let useSoftwareRendering = MetalCompatibility.shared.shouldUseSoftwareRendering
            print("🔧 AppCard (Featured): MetalCompatibility.shouldUseSoftwareRendering = \(useSoftwareRendering)")
            
            // For NVIDIA systems, use navigation instead of sheets to avoid CoreImage Metal issues
            if useSoftwareRendering {
                print("🛡️ AppCard (Featured): NVIDIA detected - using NAVIGATION instead of sheet")
                selectedApp = app
                showingAppDetail = true
                print("✅ AppCard (Featured): Set NAVIGATION for \(app.name) - selectedApp set, showingAppDetail = true")
            } else {
                // For non-NVIDIA systems, use sheet
                print("🔧 AppCard (Featured): Non-NVIDIA system - using SHEET presentation")
                showingDetail = true 
                print("✅ AppCard (Featured): Set showingDetail = true for \(app.name)")
            }
        }) {
            HStack(spacing: 16) {
                // App icon
                AsyncImageCompat(url: URL(string: app.icon_url ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(.controlBackgroundColor))
                        .overlay(
                            Image(systemName: "app.dashed")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 80, height: 80)
                .cornerRadius(20)
                
                // App info
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("FEATURED")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue)
                            .cornerRadius(4)
                        
                        Spacer()
                    }
                    
                    Text(app.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    Text(app.description.prefix(120) + (app.description.count > 120 ? "..." : ""))
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    HStack {
                        if let rating = app.rating, rating > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.subheadline)
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", rating))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                
                                if let ratingCount = app.rating_count, ratingCount > 0 {
                                    Text("(\(ratingCount))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        
                        Spacer()
                        
                        Text(app.displayPrice)
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(app.isFreeApp ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                            .foregroundColor(app.isFreeApp ? .green : .blue)
                            .cornerRadius(12)
                    }
                }
                
                Spacer()
            }
            .padding(20)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.blue.opacity(0.3), lineWidth: 1)
            )
            .scaleEffect(hovering ? 1.02 : 1.0)
            .shadow(color: .black.opacity(hovering ? 0.15 : 0.08), radius: hovering ? 12 : 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    VStack {
        AppCard(app: .preview, style: .standard, selectedApp: .constant(nil), showingAppDetail: .constant(false))
            .frame(width: 200)
        
        AppCard(app: .preview, style: .compact, selectedApp: .constant(nil), showingAppDetail: .constant(false))
            .frame(width: 300)
        
        AppCard(app: .preview, style: .featured, selectedApp: .constant(nil), showingAppDetail: .constant(false))
            .frame(width: 400)
    }
    .padding()
} 