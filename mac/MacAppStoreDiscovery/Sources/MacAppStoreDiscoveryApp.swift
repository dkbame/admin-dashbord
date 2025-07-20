//
//  MacAppStoreDiscoveryApp.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
//

import SwiftUI

@main
struct MacAppStoreDiscoveryApp: App {
    @StateObject private var apiService = APIService()
    @StateObject private var authManager = AuthManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(apiService)
                .environmentObject(authManager)
                .frame(minWidth: 800, minHeight: 600)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        
        Settings {
            SettingsView()
                .environmentObject(authManager)
        }
    }
} 