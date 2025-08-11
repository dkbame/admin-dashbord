import SwiftUI

struct AllTopRatedAppsView: View {
    @StateObject private var apiService = APIService()
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if isLoading {
                    ProgressView("Loading top rated apps...")
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
                                await loadTopRatedApps()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else if apiService.topRatedApps.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "star.circle")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Top Rated Apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Check back later for top rated apps")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else {
                    ForEach(apiService.topRatedApps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Top Rated")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await loadTopRatedApps()
        }
        .task {
            if apiService.topRatedApps.isEmpty {
                await loadTopRatedApps()
            }
        }
    }
    
    private func loadTopRatedApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            await apiService.loadTopRatedApps()
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
        AllTopRatedAppsView()
    }
}
