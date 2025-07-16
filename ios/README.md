# App Store Discovery iOS App

A complete iOS app for discovering macOS applications, built as a single Swift file for easy setup and use.

## Quick Start

### Option 1: Create New Xcode Project
1. Open Xcode
2. Create a new iOS App project (File → New → Project → iOS App)
3. Replace the default `ContentView.swift` with the contents of `AppStoreDiscovery.swift`
4. Make sure your project targets iOS 17.0+
5. Build and run

### Option 2: Use as Swift Package
1. Create a new iOS project in Xcode
2. Add the `AppStoreDiscovery.swift` file to your project
3. Make sure your project targets iOS 17.0+
4. Build and run

## Features

✅ **Complete iOS App** - All functionality in one file  
✅ **Modern SwiftUI Interface** - Beautiful, native iOS design  
✅ **API Integration** - Connects to your admin dashboard  
✅ **Search & Filter** - Find apps by name, description, or developer  
✅ **Category Browsing** - Interactive category grid  
✅ **App Details** - Comprehensive app information with screenshots  
✅ **Deep Linking** - Direct links to App Store and websites  
✅ **Pull-to-Refresh** - Easy content updates  
✅ **Error Handling** - User-friendly error messages  

## Setup

1. **Start the Admin Dashboard:**
   ```bash
   cd admin-dashboard
   npm run dev
   ```

2. **Open in Xcode:**
   - Create a new iOS App project
   - Copy the contents of `AppStoreDiscovery.swift`
   - Replace your `ContentView.swift` with the copied content
   - Build and run

## API Configuration

The app connects to your admin dashboard at `http://localhost:3000`. To change this:

1. Open `AppStoreDiscovery.swift`
2. Find the `APIService` class
3. Modify the `baseURL` property:
   ```swift
   private let baseURL = "http://your-backend-url:port/api"
   ```

## Project Structure

The single file contains:
- **Data Models** - `App` and `Category`
- **API Service** - `APIService` for networking
- **Views** - All UI components including:
  - `ContentView` - Main tab view
  - `HomeView` - Featured and all apps
  - `CategoriesView` - Category grid
  - `SearchView` - Search functionality
  - `AppDetailView` - Detailed app information
  - `FavoritesView` - Placeholder for favorites

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Admin dashboard running on `http://localhost:3000`

## Next Steps

- Add favorites functionality with local storage
- Implement push notifications
- Add offline caching
- Create app icons and launch screen
- Prepare for App Store submission

This single-file approach makes it easy to get started quickly while maintaining all the functionality of a full iOS app! 