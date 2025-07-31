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
    
    @State private var categoryApps: [AppModel] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    init(category: Category, apiService: APIService) {
        self.category = category
        self.apiService = apiService
        print("[DEBUG] CategoryDetailView - Initialized for category: \(category.name)")
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if isLoading {
                    LoadingView()
                } else if let errorMessage = errorMessage {
                    ErrorView(message: errorMessage, retryAction: loadCategoryApps)
                } else if categoryApps.isEmpty {
                    VStack(spacing: 20) {
                        Text("No apps found in \(category.name)")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Button("Refresh") {
                            loadCategoryApps()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else {
                    AppListView(apps: categoryApps)
                }
            }
            .navigationTitle(category.name)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Refresh") {
                        loadCategoryApps()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                print("[DEBUG] CategoryDetailView - onAppear triggered for category: \(category.name)")
                loadCategoryApps()
            }
        }
    }
    
    private func loadCategoryApps() {
        Task {
            print("[DEBUG] CategoryDetailView - Starting to load apps for category: \(category.name) (ID: \(category.id))")
            
            await MainActor.run {
                isLoading = true
                errorMessage = nil
                categoryApps = [] // Clear existing apps
            }
            
            do {
                let apps = await apiService.fetchAppsByCategory(categoryId: category.id)
                print("[DEBUG] CategoryDetailView - Successfully fetched \(apps.count) apps for category: \(category.name)")
                
                await MainActor.run {
                    self.categoryApps = apps
                    self.isLoading = false
                    print("[DEBUG] CategoryDetailView - Updated UI with \(self.categoryApps.count) apps")
                }
            } catch {
                print("[DEBUG] CategoryDetailView - Error loading apps: \(error.localizedDescription)")
                await MainActor.run {
                    self.errorMessage = "Failed to load apps: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Loading apps...")
                .font(.body)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Error View
struct ErrorView: View {
    let message: String
    let retryAction: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text("Error Loading Apps")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button("Retry") {
                retryAction()
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
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
                DetailRow(title: "Version", value: VersionFormatter.formatVersion(app.version))
                DetailRow(title: "Size", value: FileSizeFormatter.formatFileSize(app.size))

                DetailRow(title: "Last Updated", value: app.formattedLastUpdated)
                DetailRow(title: "Minimum OS", value: MinimumOSFormatter.formatMinimumOS(app.minimum_os_version))
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
        let formatter = Foundation.DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return dateString
    }
}



#Preview {
    CategoryDetailView(
        category: Category(id: "1", name: "Productivity", slug: "productivity", created_at: nil),
        apiService: APIService()
    )
} 