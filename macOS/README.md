# 🍎 **macOS App Discovery**

A native macOS application for discovering amazing macOS applications, built with SwiftUI. This app connects to the same backend as the iOS version, providing a seamless experience across Apple platforms.

## 🎯 **Features**

- **🏠 Home Dashboard** - Featured apps, top-rated, free apps, and new releases
- **📁 Categories** - Browse apps by category with detailed statistics
- **🔍 Advanced Search** - Filter by price, rating, and type with real-time results
- **❤️ Favorites** - Save and manage your favorite apps locally
- **📱 Native macOS Design** - Sidebar navigation, context menus, and macOS-native UI
- **🔄 Real-time Data** - Connected to the same Supabase backend as iOS and web admin
- **💾 Offline Support** - Cached data for offline browsing

## 🏗️ **Architecture**

### **Project Structure**
```
macOS/AppStoreDiscovery-macOS/
├── AppStoreDiscovery-macOS/
│   ├── AppStoreDiscoveryApp.swift          # App entry point
│   ├── ContentView.swift                   # Main sidebar navigation
│   ├── Models/                             # Shared data models
│   │   ├── AppModel.swift                  # App data model
│   │   └── Category.swift                  # Category data model
│   ├── Services/                           # API and backend services
│   │   ├── APIService.swift                # Main API service (shared with iOS)
│   │   └── SupabaseManager.swift           # Supabase client (shared with iOS)
│   ├── Views/                              # Main app views
│   │   ├── HomeView.swift                  # Home dashboard
│   │   ├── CategoriesView.swift            # Category browsing with sidebar
│   │   ├── SearchView.swift                # Advanced search with filters
│   │   ├── FavoritesView.swift             # Favorites management
│   │   ├── SidebarView.swift               # Main navigation sidebar
│   │   ├── SettingsView.swift              # App settings
│   │   └── AppDetailView.swift             # Detailed app information
│   └── Components/                         # Reusable UI components
│       └── AppCard.swift                   # App display cards (3 styles)
└── AppStoreDiscovery-macOSTests/           # Unit tests
```

### **Shared Components**
- **Models**: 100% shared with iOS (AppModel, Category, Screenshot)
- **API Service**: Identical backend integration as iOS
- **Supabase Manager**: Same database connection and authentication

### **macOS-Specific Features**
- **NavigationSplitView**: Native sidebar navigation
- **Context Menus**: Right-click actions for apps
- **Hover Effects**: Interactive hover states for better UX
- **Multiple Window Support**: Settings and detail views in separate windows
- **Keyboard Shortcuts**: Native macOS keyboard navigation
- **Sharing Service**: Native macOS sharing integration

## 🚀 **Getting Started**

### **Prerequisites**
- **macOS 11.0+** (Big Sur or later)
- **Xcode 15.0+**
- **Swift 5.9+**
- **Internet connection** for API access

### **Compatibility**
- ✅ **Intel Macs** (x86_64) - Including older Intel + Nvidia systems
- ✅ **Apple Silicon** (arm64) - M1, M2, M3 Macs
- ✅ **Universal Binary** - Single app supports both architectures

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/iOSstore.git
   cd iOSstore/macOS
   ```

2. **Open in Xcode**
   ```bash
   open AppStoreDiscovery-macOS/AppStoreDiscovery-macOS.xcodeproj
   ```

3. **Build and Run**
   - Select your target device/simulator
   - Press `⌘+R` to build and run
   - No additional setup required - connects to existing backend

### **Backend Connection**
The macOS app automatically connects to the same Supabase backend as the iOS app:
- **API URL**: `https://fnpwgnlvjhtddovkeuch.supabase.co`
- **Database**: PostgreSQL with optimized views
- **Authentication**: Anonymous access (same as iOS)
- **Real-time**: Cached data with refresh capabilities

## 🎨 **Design System**

### **macOS Design Patterns**
- **Sidebar Navigation**: Primary navigation in left sidebar
- **Split View**: Category browsing with master-detail layout
- **Toolbar Integration**: Search and actions in native toolbar
- **Context Menus**: Right-click for additional actions
- **Native Controls**: Uses macOS-native buttons, toggles, and inputs

### **Card Styles**
- **Standard Card**: Default grid layout for app browsing
- **Compact Card**: Horizontal layout for lists
- **Featured Card**: Highlighted layout for featured apps

### **Color Scheme**
- **Adaptive**: Supports both light and dark mode
- **System Colors**: Uses macOS system colors for consistency
- **Accent Color**: Blue primary with semantic colors

## 📊 **Performance**

### **Optimization Features**
- **Lazy Loading**: Views and images load on demand
- **Caching**: API responses cached for 5 minutes
- **Task Management**: Prevents memory leaks from cancelled requests
- **Image Caching**: Automatic image caching via AsyncImage
- **Efficient Networking**: Optimized Supabase queries

### **Memory Management**
- **ObservableObject**: Proper SwiftUI state management
- **Task Cancellation**: Prevents resource leaks
- **Weak References**: Avoids retain cycles
- **Efficient Queries**: Uses database views for better performance

## 🔧 **Development**

### **Key Technologies**
- **SwiftUI**: Modern declarative UI framework
- **Combine**: Reactive programming for data flow
- **URLSession**: Network layer with async/await
- **UserDefaults**: Local favorites storage
- **Supabase**: Backend-as-a-Service

### **Code Architecture**
- **MVVM Pattern**: Clear separation of concerns
- **Environment Objects**: Shared state management
- **Modular Design**: Reusable components and views
- **Type Safety**: Strong typing throughout

### **Testing**
```bash
# Run unit tests
⌘+U in Xcode

# Run tests from command line
xcodebuild test -scheme AppStoreDiscovery-macOS
```

## 🎯 **Usage Guide**

### **Navigation**
- **Sidebar**: Click sections to navigate (Home, Categories, Search, Favorites)
- **Toolbar**: Use refresh button and search field
- **Context Menus**: Right-click apps for additional options

### **Browsing Apps**
1. **Home**: Browse featured, top-rated, and new releases
2. **Categories**: Explore apps by category with statistics
3. **Search**: Use filters and sorting for specific needs
4. **Details**: Click any app for comprehensive information

### **Managing Favorites**
- **Add**: Right-click any app → "Add to Favorites"
- **Remove**: Right-click in Favorites → "Remove from Favorites"
- **Clear All**: Use toolbar button in Favorites view

## 🔄 **Updates & Sync**

### **Data Synchronization**
- **Automatic Refresh**: Pull-to-refresh in all views
- **Cache Management**: 5-minute cache validity
- **Offline Support**: Cached data available offline
- **Real-time**: Connects to live database

### **App Updates**
The macOS app stays synchronized with:
- **iOS App**: Same backend and data
- **Web Admin**: Changes reflect immediately
- **Database**: Uses optimized views for performance

## 🐛 **Troubleshooting**

### **Common Issues**

**App won't start:**
- Ensure macOS 11.0+ (check About This Mac)
- Try building in Xcode with latest version

**No data loading:**
- Check internet connection
- Verify Supabase API is accessible
- Try refreshing the view

**Performance issues:**
- Clear app cache by restarting
- Check available memory
- Update to latest macOS version

**Compatibility issues:**
- Intel Macs: Ensure proper architecture build
- Apple Silicon: Build for arm64 or Universal

### **Debug Mode**
The app includes console logging for development:
```
[DEBUG] fetchApps - Task started
[DEBUG] fetchApps - Response status: 200
[DEBUG] Found 25 apps
```

## 📝 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add new feature'`
5. Push branch: `git push origin feature/new-feature`
6. Create Pull Request

### **Code Standards**
- Follow Swift API Design Guidelines
- Use SwiftUI best practices
- Include unit tests for new features
- Document public APIs
- Test on both Intel and Apple Silicon

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 **Acknowledgments**

- **iOS Project**: Shares architecture and backend
- **Supabase**: Backend infrastructure
- **SwiftUI**: Modern UI framework
- **Apple**: macOS platform and development tools

---

**Version**: 1.0.0  
**Minimum macOS**: 11.0 (Big Sur)  
**Architecture**: Universal (Intel + Apple Silicon)  
**Last Updated**: January 2025 