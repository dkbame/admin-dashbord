//
//  AppDetailView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct AppDetailView: View {
    let app: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedScreenshotIndex = 0
    @State private var showingFullDescription = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // App Header
                    AppDetailHeader(app: app)
                    
                    // Screenshots
                    if let screenshots = app.screenshots, !screenshots.isEmpty {
                        ScreenshotsCarousel(
                            screenshots: screenshots,
                            selectedIndex: $selectedScreenshotIndex
                        )
                    }
                    
                    // App Description
                    if !app.description.isEmpty {
                        AppDescriptionView(
                            description: app.description,
                            isExpanded: $showingFullDescription
                        )
                    }
                    
                    // App Details
                    AppDetailsSection(app: app)
                    
                    // Action Buttons
                    AppActionButtons(app: app)
                }
                .padding()
            }
            .navigationTitle(app.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - App Detail Header
struct AppDetailHeader: View {
    let app: AppModel
    
    var body: some View {
        HStack(spacing: 16) {
            // App Icon
            AppIconView(app: app, size: CGSize(width: 100, height: 100))
            
            // App Info
            VStack(alignment: .leading, spacing: 8) {
                Text(app.name)
                    .font(.title2)
                    .fontWeight(.bold)
                    .lineLimit(2)
                
                if let developer = app.developer {
                    Text(developer)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    PriceBadge(app: app, size: .large)
                    
                    if let rating = app.rating {
                        Spacer()
                        RatingView(rating: rating, size: .large)
                    }
                }
                
                // Additional metadata
                if let ratingCount = app.rating_count, ratingCount > 0 {
                    Text("\(ratingCount) ratings")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
        }
    }
}

// MARK: - Screenshots Carousel
struct ScreenshotsCarousel: View {
    let screenshots: [Screenshot]
    @Binding var selectedIndex: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Screenshots")
                .font(.title3)
                .fontWeight(.semibold)
            
            TabView(selection: $selectedIndex) {
                ForEach(Array(screenshots.enumerated()), id: \.element.id) { index, screenshot in
                    AsyncImage(url: URL(string: screenshot.url)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.3))
                            .overlay(
                                ProgressView()
                                    .scaleEffect(0.8)
                            )
                    }
                    .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .automatic))
            .frame(height: 300)
            
            // Screenshot captions
            if selectedIndex < screenshots.count {
                let screenshot = screenshots[selectedIndex]
                if let caption = screenshot.caption, !caption.isEmpty {
                    Text(caption)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - App Description View
struct AppDescriptionView: View {
    let description: String
    @Binding var isExpanded: Bool
    
    private var truncatedDescription: String {
        let maxLength = 200
        if description.count <= maxLength {
            return description
        }
        let truncated = String(description.prefix(maxLength))
        return truncated + "..."
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Description")
                .font(.title3)
                .fontWeight(.semibold)
            
            Text(isExpanded ? description : truncatedDescription)
                .font(.body)
                .lineSpacing(4)
            
            if description.count > 200 {
                Button(isExpanded ? "Show Less" : "Read More") {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isExpanded.toggle()
                    }
                }
                .font(.subheadline)
                .foregroundColor(.blue)
            }
        }
    }
}

// MARK: - App Details Section
struct AppDetailsSection: View {
    let app: AppModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.title3)
                .fontWeight(.semibold)
            
            VStack(spacing: 8) {
                DetailRow(title: "Version", value: VersionFormatter.formatVersion(app.version))
                DetailRow(title: "Size", value: FileSizeFormatter.formatFileSize(app.size))
                DetailRow(title: "Architecture", value: app.architecture ?? "Unknown")
                DetailRow(title: "Release Date", value: DateFormatter.shared.formatDate(app.release_date))
                DetailRow(title: "Last Updated", value: DateFormatter.shared.formatDate(app.last_updated))
                DetailRow(title: "Minimum OS", value: MinimumOSFormatter.formatMinimumOS(app.minimum_os_version))
                
                if let features = app.features, !features.isEmpty {
                    DetailRow(title: "Features", value: features.joined(separator: ", "))
                }
                
                if let currency = app.currency {
                    DetailRow(title: "Currency", value: currency)
                }
            }
        }
    }
}

// MARK: - App Action Buttons
struct AppActionButtons: View {
    let app: AppModel
    
    var body: some View {
        VStack(spacing: 12) {
            // Primary action button
            if let appStoreUrl = app.app_store_url, !appStoreUrl.isEmpty {
                Button(action: {
                    if let url = URL(string: appStoreUrl) {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "arrow.down.circle.fill")
                        Text("Download from App Store")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
            }
            
            // Secondary action buttons
            HStack(spacing: 12) {
                if let websiteUrl = app.website_url, !websiteUrl.isEmpty {
                    Button(action: {
                        if let url = URL(string: websiteUrl) {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "globe")
                            Text("Website")
                        }
                        .font(.subheadline)
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
                
                Button(action: {
                    // TODO: Implement share functionality
                    let developerName = app.developer ?? "Unknown Developer"
                    let shareText = "Check out \(app.name) by \(developerName)"
                    let activityVC = UIActivityViewController(
                        activityItems: [shareText],
                        applicationActivities: nil
                    )
                    
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let window = windowScene.windows.first {
                        window.rootViewController?.present(activityVC, animated: true)
                    }
                }) {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text("Share")
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
                }
            }
        }
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 100, alignment: .leading)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - App Detail Preview
struct AppDetailPreview: View {
    let app: AppModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                AppIconView(app: app, size: CGSize(width: 60, height: 60))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.headline)
                        .lineLimit(2)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        PriceBadge(app: app, size: .small)
                        
                        if let rating = app.rating {
                            Spacer()
                            RatingView(rating: rating, size: .small)
                        }
                    }
                }
                
                Spacer()
            }
            
            if !app.description.isEmpty {
                Text(app.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

#Preview {
    AppDetailView(app: AppModel.preview)
} 