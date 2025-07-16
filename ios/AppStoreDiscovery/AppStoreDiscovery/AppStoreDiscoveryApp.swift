//
//  AppStoreDiscoveryApp.swift
//  AppStoreDiscovery
//
//  Created by iMac on 12/7/2025.
//
import SwiftUI

@main
struct AppStoreDiscoveryApp: App {
    init() {
        print("[DEBUG] AppStoreDiscoveryApp init called")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    print("[DEBUG] ContentView onAppear in main app")
                }
        }
    }
}
