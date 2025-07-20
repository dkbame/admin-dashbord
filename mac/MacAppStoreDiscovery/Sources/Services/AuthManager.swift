//
//  AuthManager.swift
//  MacAppStoreDiscovery
//
//  Created by iOSstore Team
//

import Foundation
import Combine

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Check for existing session
        checkAuthenticationStatus()
    }
    
    // MARK: - Authentication Status
    
    private func checkAuthenticationStatus() {
        // For now, we'll use a simple approach
        // In a real app, you'd check for valid tokens
        isAuthenticated = false
    }
    
    // MARK: - Sign In
    
    func signIn(email: String, password: String) async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        // Simulate authentication
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        await MainActor.run {
            isAuthenticated = true
            currentUser = User(id: "user-1", email: email, name: "User")
            isLoading = false
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() {
        isAuthenticated = false
        currentUser = nil
        errorMessage = nil
    }
    
    // MARK: - Error Handling
    
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - User Model

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let created_at: String?
    
    var displayName: String {
        return name.isEmpty ? email : name
    }
} 