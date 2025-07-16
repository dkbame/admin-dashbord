//
//  ContentView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var apiService = APIService()

    var body: some View {
        NavigationView {
            Group {
                if apiService.isLoading {
                    ProgressView("Loading...")
                } else if let error = apiService.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                } else {
                    List(apiService.apps) { app in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(app.name)
                                .font(.headline)
                            Text(app.description)
                                .font(.subheadline)
                            if let screenshots = app.screenshots, !screenshots.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(screenshots) { screenshot in
                                            if let url = URL(string: screenshot.url) {
                                                AsyncImage(url: url) { image in
                                                    image
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fit)
                                                        .frame(height: 100)
                                                        .cornerRadius(8)
                                                } placeholder: {
                                                    ProgressView()
                                                        .frame(width: 100, height: 100)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Apps")
            .onAppear {
                print("[DEBUG] ContentView appeared")
                Task {
                    print("[DEBUG] About to call fetchApps")
                    await apiService.fetchApps()
                    print("[DEBUG] fetchApps completed")
                }
            }
        }
    }
} 