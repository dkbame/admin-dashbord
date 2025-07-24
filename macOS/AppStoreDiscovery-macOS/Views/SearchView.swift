//
//  SearchView.swift
//  AppStoreDiscovery-macOS
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

struct SearchView: View {
    @EnvironmentObject var apiService: APIService
    @State private var searchText = ""
    @State private var searchResults: [AppModel] = []
    @State private var isSearching = false
    @State private var selectedFilter: SearchFilter = .all
    @State private var sortOption: SortOption = .relevance
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    enum SearchFilter: String, CaseIterable {
        case all = "All"
        case free = "Free"
        case paid = "Paid"
        case featured = "Featured"
        
        var icon: String {
            switch self {
            case .all: return "square.grid.2x2"
            case .free: return "gift"
            case .paid: return "dollarsign.circle"
            case .featured: return "star"
            }
        }
    }
    
    enum SortOption: String, CaseIterable {
        case relevance = "Relevance"
        case name = "Name"
        case rating = "Rating"
        case newest = "Newest"
        
        var icon: String {
            switch self {
            case .relevance: return "target"
            case .name: return "textformat.abc"
            case .rating: return "star"
            case .newest: return "clock"
            }
        }
    }
    
    private var filteredResults: [AppModel] {
        var results = searchResults
        
        // Apply filter
        switch selectedFilter {
        case .all:
            break
        case .free:
            results = results.filter { $0.isFreeApp }
        case .paid:
            results = results.filter { !$0.isFreeApp }
        case .featured:
            results = results.filter { $0.is_featured == true }
        }
        
        // Apply sort
        switch sortOption {
        case .relevance:
            break // Keep original order (relevance-based from API)
        case .name:
            results = results.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .rating:
            results = results.sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
        case .newest:
            results = results.sorted { app1, app2 in
                let date1 = app1.created_at ?? ""
                let date2 = app2.created_at ?? ""
                return date1 > date2
            }
        }
        
        return results
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Search header
            VStack(spacing: 16) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    
                    TextField("Search for apps...", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 16))
                    
                    if !searchText.isEmpty {
                        Button(action: clearSearch) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
                .background(Color(.controlBackgroundColor))
                .cornerRadius(10)
                
                // Filters and sorting
                HStack {
                    // Filter pills
                    HStack(spacing: 8) {
                        ForEach(SearchFilter.allCases, id: \.self) { filter in
                            FilterPill(
                                title: filter.rawValue,
                                icon: filter.icon,
                                isSelected: selectedFilter == filter
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Sort menu
                    Menu {
                        ForEach(SortOption.allCases, id: \.self) { option in
                            Button(action: { sortOption = option }) {
                                Label(option.rawValue, systemImage: option.icon)
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: sortOption.icon)
                            Text(sortOption.rawValue)
                            Image(systemName: "chevron.down")
                                .font(.caption)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(.controlBackgroundColor))
                        .cornerRadius(8)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
            .background(Color(.windowBackgroundColor))
            
            Divider()
            
            // Search results
            if isSearching {
                HStack {
                    Spacer()
                    ProgressView("Searching...")
                        .progressViewStyle(CircularProgressViewStyle())
                    Spacer()
                }
                .frame(height: 200)
            } else if searchText.isEmpty {
                SearchSuggestionsView()
            } else if filteredResults.isEmpty {
                EmptySearchView(searchText: searchText)
            } else {
                                        SearchResultsView(apps: filteredResults, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
            }
        }
        .navigationTitle("Search")
        .onChange(of: searchText) { newValue in
            if !newValue.isEmpty {
                // Debounce search
                Task {
                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                    if searchText == newValue {
                        performSearch()
                    }
                }
            }
        }
    }
    
    private func performSearch() {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            searchResults = []
            return
        }
        
        isSearching = true
        
        Task {
            let results = await apiService.searchApps(query: searchText)
            await MainActor.run {
                self.searchResults = results
                self.isSearching = false
            }
        }
    }
    
    private func clearSearch() {
        searchText = ""
        searchResults = []
        selectedFilter = .all
        sortOption = .relevance
    }
}

// MARK: - Filter Pill
struct FilterPill: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.accentColor : Color(.controlBackgroundColor))
            )
            .foregroundColor(isSelected ? .white : .primary)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Search Results View
struct SearchResultsView: View {
    let apps: [AppModel]
    @Binding var selectedApp: AppModel?
    @Binding var showingAppDetail: Bool
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
                ForEach(apps, id: \.id) { app in
                    AppCard(app: app, style: .standard, selectedApp: $selectedApp, showingAppDetail: $showingAppDetail)
                }
            }
            .padding()
        }
    }
}

// MARK: - Empty Search View
struct EmptySearchView: View {
    let searchText: String
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Results Found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("No apps found for \"\(searchText)\"")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Search Suggestions View
struct SearchSuggestionsView: View {
    let suggestions = [
        "Productivity apps",
        "Photo editing",
        "Development tools",
        "Music apps",
        "Video editing",
        "Design software"
    ]
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("Search Apps")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Search for apps by name, developer, or description")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Try searching for:")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                    ForEach(suggestions, id: \.self) { suggestion in
                        Text(suggestion)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.controlBackgroundColor))
                            .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color(.controlBackgroundColor).opacity(0.5))
            .cornerRadius(12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

#Preview {
    SearchView(selectedApp: .constant(nil), showingAppDetail: .constant(false))
        .environmentObject(APIService())
} 