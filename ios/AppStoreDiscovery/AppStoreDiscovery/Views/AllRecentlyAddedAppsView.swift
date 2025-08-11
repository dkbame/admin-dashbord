import SwiftUI

struct AllRecentlyAddedAppsView: View {
    @StateObject private var apiService = APIService()
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if isLoading {
                    ProgressView("Loading recently added apps...")
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        
                        Text("Error")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Try Again") {
                            Task {
                                await loadRecentlyAddedApps()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else if apiService.recentlyAddedApps.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "clock.badge.plus")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Recently Added Apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Check back later for new apps")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else {
                    ForEach(apiService.recentlyAddedApps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Recently Added")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await loadRecentlyAddedApps()
        }
        .task {
            if apiService.recentlyAddedApps.isEmpty {
                await loadRecentlyAddedApps()
            }
        }
    }
    
    private func loadRecentlyAddedApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            await apiService.loadRecentlyAddedApps()
            await MainActor.run {
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

#Preview {
    NavigationView {
        AllRecentlyAddedAppsView()
    }
}
