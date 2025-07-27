//
//  AppDetailView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct AppDetailView: View {
    let app: AppModel
    @Environment(\.presentationMode) var presentationMode
    @State private var selectedScreenshot: Screenshot?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                    // Header section
                    HStack(alignment: .top, spacing: 20) {
                        // App icon
                        AsyncImageCompat(url: URL(string: app.icon_url ?? "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 24)
                                .fill(Color(.controlBackgroundColor))
                                .overlay(
                                    Image(systemName: "app.dashed")
                                        .font(.system(size: 48))
                                        .foregroundColor(.secondary)
                                )
                        }
                        .frame(width: 120, height: 120)
                        .cornerRadius(24)
                        .shadow(radius: 8)
                        
                        // App info
                        VStack(alignment: .leading, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(app.name)
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                
                                if let developer = app.developer {
                                    Text(developer)
                                        .font(.title3)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            // Rating and price
                            HStack(spacing: 20) {
                                if let rating = app.rating, rating > 0 {
                                    HStack(spacing: 6) {
                                        HStack(spacing: 2) {
                                            ForEach(1...5, id: \.self) { star in
                                                Image(systemName: star <= Int(rating.rounded()) ? "star.fill" : "star")
                                                    .foregroundColor(.yellow)
                                                    .font(.subheadline)
                                            }
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(String(format: "%.1f", rating))
                                                .font(.subheadline)
                                                .fontWeight(.semibold)
                                            
                                            if let ratingCount = app.rating_count, ratingCount > 0 {
                                                Text("\(ratingCount) ratings")
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                            }
                                        }
                                    }
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(app.displayPrice)
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundColor(app.isFreeApp ? .green : .blue)
                                    
                                    if app.is_featured == true {
                                        Text("FEATURED")
                                            .font(.caption2)
                                            .fontWeight(.bold)
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.blue)
                                            .cornerRadius(4)
                                    }
                                }
                            }
                            
                            // Action buttons
                            HStack(spacing: 12) {
                                if let appStoreUrl = app.app_store_url, let url = URL(string: appStoreUrl) {
                                    Button("View in App Store") {
                                        NSWorkspace.shared.open(url)
                                    }
                                    .buttonStyle(.bordered)
                                }
                                
                                if let websiteUrl = app.website_url, let url = URL(string: websiteUrl) {
                                    Button("Visit Website") {
                                        NSWorkspace.shared.open(url)
                                    }
                                    .buttonStyle(.bordered)
                                }
                                
                                Button("Share") {
                                    shareApp()
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                        
                        Spacer()
                    }
                    
                    Divider()
                    
                    // Screenshots section
                    if let screenshots = app.screenshots, !screenshots.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Screenshots")
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(screenshots, id: \.id) { screenshot in
                                        AsyncImageCompat(url: URL(string: screenshot.url)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fit)
                                        } placeholder: {
                                            Rectangle()
                                                .fill(Color(.controlBackgroundColor))
                                                .overlay(
                                                    ProgressView()
                                                        .progressViewStyle(CircularProgressViewStyle(tint: .secondary))
                                                )
                                        }
                                        .frame(width: 400, height: 250)
                                        .cornerRadius(12)
                                        .shadow(radius: 4)
                                        .onTapGesture {
                                            selectedScreenshot = screenshot
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        
                        Divider()
                    }
                    
                    // Description section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Description")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text(app.description)
                            .font(.body)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    Divider()
                    
                    // Information section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Information")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible(), alignment: .leading),
                            GridItem(.flexible(), alignment: .leading)
                        ], alignment: .leading, spacing: 12) {
                            
                            if let version = app.version {
                                InfoRow(title: "Version", value: version)
                            }
                            
                            if let size = app.size {
                                InfoRow(title: "Size", value: app.formattedSize)
                            }
                            
                            if let minimumOS = app.minimum_os_version {
                                InfoRow(title: "Minimum OS", value: minimumOS)
                            }
                            
                            if let architecture = app.architecture {
                                InfoRow(title: "Architecture", value: architecture)
                            }
                            
                            InfoRow(title: "Last Updated", value: app.formattedLastUpdated)
                            
                            if let currency = app.currency {
                                InfoRow(title: "Currency", value: currency)
                            }
                        }
                    }
                    
                    // Features section
                    if let features = app.features, !features.isEmpty {
                        Divider()
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Features")
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                                ForEach(features, id: \.self) { feature in
                                    HStack {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                        Text(feature)
                                            .font(.body)
                                        Spacer()
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        .navigationTitle(app.name)
        .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
        .frame(width: 800, height: 600)
        .safeSheet(item: $selectedScreenshot) { screenshot in
            ScreenshotDetailView(screenshot: screenshot)
        }
    }
    
    private func shareApp() {
        let items: [Any] = [
            app.name,
            app.app_store_url ?? app.website_url ?? ""
        ].compactMap { $0 }
        
        let picker = NSSharingServicePicker(items: items)
        picker.show(relativeTo: .zero, of: NSApp.keyWindow?.contentView ?? NSView(), preferredEdge: .minY)
    }


// MARK: - Info Row
struct InfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.body)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Screenshot Detail View
struct ScreenshotDetailView: View {
    let screenshot: Screenshot
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack {
                                            AsyncImageCompat(url: URL(string: screenshot.url)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                }
                .cornerRadius(12)
                .shadow(radius: 8)
                
                if let caption = screenshot.caption {
                    Text(caption)
                        .font(.title3)
                        .fontWeight(.medium)
                        .padding()
                }
            }
            .padding()
            .navigationTitle("Screenshot")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
        .frame(width: 1000, height: 700)
    }
}

#Preview {
    AppDetailView(app: .preview)
} 
