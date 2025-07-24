//
//  SidebarView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct SidebarView: View {
    @Binding var selectedView: SidebarItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Discover")
                .font(.headline)
                .foregroundColor(.secondary)
                .padding(.horizontal)
                .padding(.top)
            
            List {
                ForEach(SidebarItem.allCases, id: \.self) { item in
                    Button(action: {
                        selectedView = item
                    }) {
                        HStack {
                    Label(item.rawValue, systemImage: item.iconName)
                                .foregroundColor(selectedView == item ? .accentColor : .primary)
                            Spacer()
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(PlainButtonStyle())
                    .background(selectedView == item ? Color.accentColor.opacity(0.2) : Color.clear)
                    .cornerRadius(6)
            }
        }
            .listStyle(SidebarListStyle())
        }
        .navigationTitle("macOS Apps")
    }
}

#Preview {
    SidebarView(selectedView: .constant(.home))
} 