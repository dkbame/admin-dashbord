//
//  SettingsView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct SettingsView: View {
    @AppStorage("refreshInterval") private var refreshInterval: Double = 300 // 5 minutes
    @AppStorage("showRatings") private var showRatings: Bool = true
    @AppStorage("compactView") private var compactView: Bool = false
    
    var body: some View {
        TabView {
            GeneralSettingsView(
                refreshInterval: $refreshInterval,
                showRatings: $showRatings,
                compactView: $compactView
            )
            .tabItem {
                Label("General", systemImage: "gear")
            }
            
            AboutView()
                .tabItem {
                    Label("About", systemImage: "info.circle")
                }
        }
        .frame(width: 500, height: 400)
    }
}

struct GeneralSettingsView: View {
    @Binding var refreshInterval: Double
    @Binding var showRatings: Bool
    @Binding var compactView: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Display Section
            VStack(alignment: .leading, spacing: 8) {
                Text("Display")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 4) {
                Toggle("Show app ratings", isOn: $showRatings)
                Toggle("Use compact view", isOn: $compactView)
            }
                .padding(.leading)
            }
            
            Divider()
            
            // Data Section
            VStack(alignment: .leading, spacing: 8) {
                Text("Data")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Refresh interval: \(Int(refreshInterval / 60)) minutes")
                    Slider(value: $refreshInterval, in: 60...1800, step: 60)
                }
                .padding(.leading)
            }
            
            Divider()
            
            // System Compatibility Section
            VStack(alignment: .leading, spacing: 8) {
                Text("System Compatibility")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Graphics Rendering:")
                        Spacer()
                        Text(MetalCompatibility.shared.shouldUseSoftwareRendering ? "Software" : "Hardware")
                            .foregroundColor(MetalCompatibility.shared.shouldUseSoftwareRendering ? .orange : .green)
                            .fontWeight(.medium)
                    }
                    
                    if MetalCompatibility.shared.shouldUseSoftwareRendering {
                        Text("Using software rendering for compatibility with older graphics hardware")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Using hardware acceleration for optimal performance")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.leading)
            }
            
            Spacer()
        }
        .padding()
    }
}

struct AboutView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "macwindow")
                .font(.system(size: 64))
                .foregroundColor(.blue)
            
            Text("macOS App Discovery")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Version 1.0.0")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text("Discover amazing macOS applications")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
            
            Spacer()
        }
        .padding()
    }
}

#Preview {
    SettingsView()
} 