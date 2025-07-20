//
//  AppSectionView.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - App Section View
struct AppSectionView: View {
    let title: String
    let apps: [AppModel]
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                    .font(.title2)
                
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                NavigationLink("See All", destination: Text("See All \(title)"))
                    .font(.subheadline)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
            
            // Horizontal App List
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(apps) { app in
                        HorizontalAppCard(app: app)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

#Preview {
    AppSectionView(
        title: "Featured Apps",
        apps: [AppModel.preview],
        icon: "star.fill"
    )
    .padding()
} 