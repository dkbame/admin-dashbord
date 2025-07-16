# macOS App Discovery (iOS)

A comprehensive iOS application that helps users discover macOS applications, both from the Mac App Store and independent developers. The project includes an iOS client app and a web-based admin dashboard.

## Project Overview

### iOS App Features
- Browse and discover macOS applications
- Categorized app listings with interactive grid layout
- Detailed app information and screenshots
- Real-time search functionality
- Featured apps carousel
- Pull-to-refresh for updated content
- App Store and website deep linking
- Modern SwiftUI interface with smooth animations
- Offline-ready architecture

### Web Admin Dashboard
- Secure authentication system
- Mac App Store Integration
  - Import apps via MAS URL
  - Automatic metadata fetching
  - Periodic updates for app information
- Custom App Management
  - Manual app submission form
  - Image upload for screenshots and icons
  - Custom metadata fields
- Category management
- Analytics and reporting
- Content moderation tools

### Technical Stack

#### iOS App
- SwiftUI for modern iOS development
- MVVM architecture with ObservableObject
- URLSession with async/await for networking
- AsyncImage for efficient image loading
- Tab-based navigation with 4 main sections
- Sheet presentations for detailed views

#### Backend Infrastructure
- Supabase for backend services
  - PostgreSQL database
  - Real-time subscriptions
  - Built-in authentication
  - Row Level Security (RLS)
  - Storage for images and assets
  - Edge Functions for custom logic
  - Database backups and monitoring
- iTunes Search API integration

#### Web Admin Dashboard
- React.js for frontend
- Material-UI for components
- Supabase JavaScript client
- TypeScript for type safety
- Image upload with preview and cropping

### Project Structure

```
iOSstore/
├── ios/                          # iOS App
│   ├── AppStoreDiscovery/        # Main app directory
│   │   ├── AppStoreDiscoveryApp.swift  # App entry point
│   │   ├── ContentView.swift           # Main tab view
│   │   ├── Models/                     # Data models
│   │   │   ├── App.swift               # App model
│   │   │   └── Category.swift          # Category model
│   │   ├── Services/                   # API services
│   │   │   └── APIService.swift        # Network layer
│   │   ├── Views/                      # SwiftUI views
│   │   │   └── AppDetailView.swift     # App detail view
│   │   ├── Assets.xcassets/            # App icons and assets
│   │   └── Preview Content/            # SwiftUI previews
│   ├── AppStoreDiscovery.xcodeproj/    # Xcode project
│   └── README.md                       # iOS app documentation
├── admin-dashboard/              # Web Admin Interface
│   ├── src/                      # React components
│   │   ├── app/                  # Next.js app directory
│   │   │   ├── api/              # API routes
│   │   │   │   ├── apps/         # Apps API endpoint
│   │   │   │   └── categories/   # Categories API endpoint
│   │   │   ├── dashboard/        # Admin dashboard pages
│   │   │   └── components/       # Reusable components
│   │   ├── lib/                  # Utilities and services
│   │   └── theme.ts              # Theme configuration
│   ├── public/                   # Static assets
│   └── package.json              # Dependencies
└── supabase/                     # Supabase Configuration
    ├── migrations/               # Database migrations
    └── seed.sql                  # Seed data
```

### Database Schema (Supabase PostgreSQL)

```sql
-- Apps table
create table apps (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  developer text not null,
  category_id uuid references categories(id),
  price numeric(10,2),
  currency text,
  is_on_mas boolean default false,
  mas_id text unique,
  mas_url text,
  download_url text,
  website_url text,
  icon_url text,
  minimum_os_version text,
  last_updated timestamp with time zone default now(),
  features text[],
  source text check (source in ('MAS', 'CUSTOM')),
  status text check (status in ('ACTIVE', 'PENDING', 'INACTIVE')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Screenshots table
create table screenshots (
  id uuid default gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  url text not null,
  caption text,
  display_order integer,
  created_at timestamp with time zone default now()
);

-- Categories table
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default now()
);

-- Custom metadata table
create table custom_metadata (
  id uuid default gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  license text,
  release_notes text,
  system_requirements text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ratings view
create view app_ratings as
select 
  app_id,
  avg(rating)::numeric(3,2) as average_rating,
  count(*) as rating_count
from ratings
group by app_id;
```

## Getting Started

### Prerequisites
- Xcode 14+ for iOS development
- Node.js 18+ for admin dashboard
- Supabase CLI
- Supabase account

### Installation

#### Admin Dashboard Setup
1. Clone the repository
2. Set up Supabase project
   ```bash
   supabase init
   supabase start
   ```
3. Run database migrations
   ```bash
   supabase db reset
   ```
4. Configure environment variables
   ```bash
   cp .env.example .env
   # Add your Supabase URL and anon key to .env
   ```
5. Start the admin dashboard
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

#### iOS App Setup
1. Open `ios/AppStoreDiscovery.xcodeproj` in Xcode 15.0+
2. Select your development team in project settings
3. Ensure the admin dashboard is running on `http://localhost:3000`
4. Build and run the project (⌘+R)

**Note**: The iOS app connects to the admin dashboard API at `http://localhost:3000`. For production deployment, update the `baseURL` in `APIService.swift`.

## Development Roadmap

1. Phase 1: Foundation
   - Project setup and configuration
   - Supabase setup and configuration
   - Database schema implementation
   - Authentication setup
   - Mac App Store API integration

2. Phase 2: Core Features
   - Admin dashboard CRUD operations
   - MAS app import functionality
   - Custom app submission system
   - Image upload and management
   - App listing and details

3. Phase 3: iOS App Development
   - Basic UI implementation
   - App browsing and filtering
   - Detailed app views
   - Search functionality
   - Bookmarking system

4. Phase 4: Enhanced Features
   - Advanced filtering
   - Analytics implementation
   - Automated MAS updates
   - Performance optimization

5. Phase 5: Polish
   - UI/UX improvements
   - Testing and bug fixes
   - Documentation
   - Production deployment

## Contributing
Guidelines for contributing will be added as the project develops.

## License
This project is licensed under the MIT License - see the LICENSE file for details. 