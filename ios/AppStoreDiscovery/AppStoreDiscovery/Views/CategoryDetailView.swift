//
//  CategoryDetailView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct CategoryDetailView: View {
    let category: Category
    let apiService: APIService
    @Environment(\.dismiss) private var dismiss
    
    private var categoryApps: [AppModel] {
        apiService.apps.filter { $0.category_id == category.id }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if categoryApps.isEmpty {
                    EmptyStateView(category: category)
                } else {
                    AppListView(apps: categoryApps)
                }
            }
            .navigationTitle(category.name)
            .navigationBarTitleDisplayMode(.large)
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

// MARK: - Empty State View
struct EmptyStateView: View {
    let category: Category
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "folder.badge.questionmark")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Apps Found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("There are no apps in the \(category.name) category yet.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - App List View
struct AppListView: View {
    let apps: [AppModel]
    
    var body: some View {
        List(apps, id: \.id) { app in
            AppListRow(app: app)
        }
        .listStyle(PlainListStyle())
    }
}

// MARK: - App List Row
struct AppListRow: View {
    let app: AppModel
    @State private var showingAppDetail = false
    
    var body: some View {
        Button(action: {
            showingAppDetail = true
        }) {
            HStack(spacing: 12) {
                // App Icon
                if let iconUrl = app.icon_url {
                    AsyncImage(url: URL(string: iconUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.3))
                    }
                    .frame(width: 60, height: 60)
                    .cornerRadius(8)
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 60, height: 60)
                }
                
                // App Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                    
                    if let developer = app.developer {
                        Text(developer)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack {
                        if app.is_free == true {
                            Text("Free")
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.2))
                                .foregroundColor(.green)
                                .cornerRadius(4)
                        } else {
                            Text("$\(app.price ?? "0")")
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.2))
                                .foregroundColor(.blue)
                                .cornerRadius(4)
                        }
                        
                        if let rating = app.rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                    .font(.caption)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingAppDetail) {
            AppDetailView(app: app)
        }
    }
}



// MARK: - App Header View
struct AppHeaderView: View {
    let app: AppModel
    
    var body: some View {
        HStack(spacing: 16) {
            // App Icon
            if let iconUrl = app.icon_url {
                AsyncImage(url: URL(string: iconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 100, height: 100)
                .cornerRadius(12)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 100, height: 100)
            }
            
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
                    if app.is_free == true {
                        Text("Free")
                            .font(.headline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.2))
                            .foregroundColor(.green)
                            .cornerRadius(8)
                    } else {
                        Text("$\(app.price ?? "0")")
                            .font(.headline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.2))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                    
                    if let rating = app.rating {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .fontWeight(.medium)
                        }
                    }
                }
            }
            
            Spacer()
        }
    }
}

// MARK: - Screenshots View
struct ScreenshotsView: View {
    let screenshots: [Screenshot]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Screenshots")
                .font(.title3)
                .fontWeight(.semibold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(screenshots.sorted(by: { ($0.display_order ?? 0) < ($1.display_order ?? 0) }), id: \.id) { screenshot in
                        AsyncImage(url: URL(string: screenshot.url)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.3))
                        }
                        .frame(height: 200)
                        .cornerRadius(8)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Description View
struct DescriptionView: View {
    let description: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Description")
                .font(.title3)
                .fontWeight(.semibold)
            
            Text(description)
                .font(.body)
                .lineSpacing(4)
        }
    }
}

// MARK: - App Details View
struct AppDetailsView: View {
    let app: AppModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.title3)
                .fontWeight(.semibold)
            
            VStack(spacing: 8) {
                DetailRow(title: "Version", value: app.version ?? "Unknown")
                DetailRow(title: "Size", value: formatFileSize(app.size))
                DetailRow(title: "Release Date", value: formatDate(app.release_date))
                DetailRow(title: "Last Updated", value: formatDate(app.last_updated))
                DetailRow(title: "Minimum OS", value: app.minimum_os_version ?? "Unknown")
                DetailRow(title: "Category", value: "Unknown") // TODO: Add category name
            }
        }
    }
    
    private func formatFileSize(_ size: Int?) -> String {
        guard let size = size else { return "Unknown" }
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(size))
    }
    
    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "Unknown" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return dateString
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
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    CategoryDetailView(
        category: Category(id: "1", name: "Productivity", slug: "productivity", created_at: nil),
        apiService: APIService()
    )
} 