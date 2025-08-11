import SwiftUI

struct AllFreeAppsView: View {
    @StateObject private var apiService = APIService()
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if isLoading {
                    ProgressView("Loading free apps...")
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
                                await loadFreeApps()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else if apiService.freeApps.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "gift")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Free Apps")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Check back later for free apps")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                    .padding()
                } else {
                    ForEach(apiService.freeApps, id: \.id) { app in
                        NavigationLink(destination: AppDetailView(app: app)) {
                            AppCard(app: app)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Free Apps")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await loadFreeApps()
        }
        .task {
            if apiService.freeApps.isEmpty {
                await loadFreeApps()
            }
        }
    }
    
    private func loadFreeApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            await apiService.loadFreeApps()
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
        AllFreeAppsView()
    }
}
