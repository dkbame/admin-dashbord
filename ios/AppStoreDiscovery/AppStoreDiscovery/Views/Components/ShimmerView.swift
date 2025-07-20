//
//  ShimmerView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Shimmer Loading Effect
struct ShimmerView: View {
    @State private var isAnimating = false
    
    var body: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color.gray.opacity(0.3),
                Color.gray.opacity(0.1),
                Color.gray.opacity(0.3)
            ]),
            startPoint: isAnimating ? .leading : .trailing,
            endPoint: isAnimating ? .trailing : .leading
        )
        .onAppear {
            withAnimation(Animation.linear(duration: 1.0).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        ShimmerView()
            .frame(width: 200, height: 100)
            .cornerRadius(12)
        
        ShimmerView()
            .frame(width: 150, height: 150)
            .clipShape(Circle())
        
        ShimmerView()
            .frame(width: 300, height: 50)
            .cornerRadius(8)
    }
    .padding()
} 