# Mac App Store Discovery - Mac App

A native macOS application for discovering and browsing Mac App Store applications, built with SwiftUI.

## 🖥️ Features

- **Native macOS Experience** - Built specifically for macOS with proper window management
- **Sidebar Navigation** - Easy navigation between different sections
- **App Discovery** - Browse apps by category, search, and featured apps
- **Real-time Sync** - Connected to the same Supabase backend as iOS app and admin dashboard
- **Offline Support** - Cached data for offline browsing
- **Search Functionality** - Find apps by name, description, or developer
- **Responsive Design** - Adapts to different window sizes

## 🏗️ Architecture

- **SwiftUI** - Modern declarative UI framework
- **Combine** - Reactive programming for data binding
- **Supabase** - Backend database and API
- **Async/Await** - Modern concurrency for network requests

## 📁 Project Structure

```
mac/MacAppStoreDiscovery/
├── Sources/
│   ├── Models/              # Data models (AppModel, Category, User)
│   ├── Services/            # Business logic (APIService, AuthManager)
│   ├── Views/               # SwiftUI views
│   ├── Utils/               # Utility functions and formatters
│   └── Resources/           # Assets and configuration files
├── Tests/                   # Unit tests
├── UITests/                 # UI tests
└── MacAppStoreDiscovery.xcodeproj/
```

## 🚀 Getting Started

### Prerequisites

- macOS 12.0 or later
- Xcode 15.0 or later
- Swift 5.9 or later

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iOSstore/mac/MacAppStoreDiscovery
   ```

2. **Configure Supabase**
   - Update `APIService.swift` with your Supabase URL and API key
   - Replace `"https://your-project.supabase.co"` with your actual Supabase URL
   - Replace `"your-anon-key"` with your actual Supabase anon key

3. **Open in Xcode**
   ```bash
   open MacAppStoreDiscovery.xcodeproj
   ```

4. **Build and Run**
   - Select the "MacAppStoreDiscovery" scheme
   - Press Cmd+R to build and run

## 🔧 Configuration

### Supabase Setup

The app connects to the same Supabase backend as the iOS app and admin dashboard. Make sure:

1. **Database Views** - The `ios_apps_view` is properly configured
2. **API Access** - Row Level Security allows anonymous access to the views
3. **CORS** - Supabase is configured to allow requests from the Mac app

### Environment Variables

You can configure the app using environment variables or by updating the constants in `APIService.swift`:

```swift
private let supabaseURL = "https://your-project.supabase.co"
private let supabaseKey = "your-anon-key"
```

## 🎯 Features in Detail

### Navigation
- **Home** - Featured apps and recent additions
- **Categories** - Browse apps by category
- **Search** - Find specific apps
- **Featured** - Curated featured apps
- **Settings** - App configuration and account

### App Cards
- App icon and name
- Developer information
- Price (Free/Paid)
- Star rating (if available)
- Quick access to App Store

### Search
- Real-time search across app names, descriptions, and developers
- Results update as you type
- Search history (coming soon)

## 🔄 Data Synchronization

The Mac app automatically syncs with:
- **Admin Dashboard** - New apps imported via admin dashboard appear instantly
- **iOS App** - Same data, same experience across platforms
- **Real-time Updates** - Changes propagate immediately

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
xcodebuild test -scheme MacAppStoreDiscovery -destination 'platform=macOS'
```

### UI Tests
```bash
# Run UI tests
xcodebuild test -scheme MacAppStoreDiscovery -destination 'platform=macOS' -only-testing:MacAppStoreDiscoveryUITests
```

## 📦 Distribution

### Development
- Build and run directly from Xcode
- Use for testing and development

### App Store
- Archive the project
- Upload to App Store Connect
- Submit for review

### Direct Distribution
- Build for distribution
- Create DMG or PKG installer
- Distribute via website

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**
   - Ensure Xcode version is 15.0+
   - Check Swift version compatibility
   - Verify all dependencies are resolved

2. **Network Issues**
   - Verify Supabase URL and API key
   - Check network connectivity
   - Review CORS settings in Supabase

3. **Data Not Loading**
   - Check Supabase database views
   - Verify Row Level Security policies
   - Review API service logs

### Debug Mode

Enable debug logging by setting the log level in `APIService.swift`:

```swift
print("[DEBUG] fetchApps - Starting fetch")
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the iOSstore ecosystem. See the main repository for license information.

## 🔗 Related Projects

- **iOS App** - `../ios/` - Native iOS application
- **Admin Dashboard** - `../admin-dashboard/` - Web-based admin interface
- **Backend** - `../supabase/` - Database and API

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the main project documentation
- Open an issue in the repository 