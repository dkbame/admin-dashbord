import SwiftUI

struct AllFeaturedAppsView: View {
    @StateObject private var apiService = APIService()
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if isLoading {
                    ProgressView("Loading featured apps...")
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
                                await loadFeaturedApps()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else if apiService.featuredApps.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "star.square.on.square")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Featured Apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Check back later for featured apps")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else {
                    ForEach(apiService.featuredApps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Featured Apps")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await loadFeaturedApps()
        }
        .task {
            if apiService.featuredApps.isEmpty {
                await loadFeaturedApps()
            }
        }
    }
    
    private func loadFeaturedApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            await apiService.loadFeaturedApps()
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
        AllFeaturedAppsView()
    }
}
