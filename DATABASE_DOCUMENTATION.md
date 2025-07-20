# 🗄️ **Database Documentation**

## 📋 **Overview**

This document provides comprehensive documentation for the AppStore Discovery database schema, optimizations, and usage patterns. The database is built on PostgreSQL with Supabase and includes extensive performance optimizations.

## 🏗️ **Schema Overview**

### **Core Tables**

#### **1. apps** - Main applications table
```sql
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  developer TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  price NUMERIC(10,2),
  currency TEXT,
  is_on_mas BOOLEAN DEFAULT false,
  mas_id TEXT UNIQUE,
  mas_url TEXT,
  download_url TEXT,
  website_url TEXT,
  icon_url TEXT,
  minimum_os_version TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  features TEXT[],
  source TEXT CHECK (source IN ('MAS', 'CUSTOM')),
  status TEXT CHECK (status IN ('ACTIVE', 'PENDING', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- iOS Integration Fields
  is_featured BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  rating NUMERIC(3,2),
  rating_count INTEGER DEFAULT 0,
  release_date DATE,
  size INTEGER, -- in bytes
  version TEXT,
  app_store_url TEXT
);
```

#### **2. categories** - App categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **3. screenshots** - App screenshots
```sql
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **4. ratings** - User ratings and reviews
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **5. custom_metadata** - Additional app metadata
```sql
CREATE TABLE custom_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  license TEXT,
  release_notes TEXT,
  system_requirements TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 🚀 **Performance Optimizations**

### **Indexes**

#### **Primary Query Indexes**
- `idx_apps_status` - Filter by app status
- `idx_apps_featured` - Filter featured apps
- `idx_apps_free` - Filter free apps
- `idx_apps_rating` - Sort by rating
- `idx_apps_created_at` - Sort by creation date
- `idx_apps_release_date` - Filter by release date
- `idx_apps_category_id` - Join with categories
- `idx_apps_developer` - Filter by developer

#### **Full-Text Search Indexes**
- `idx_apps_name` - Search app names
- `idx_apps_description` - Search descriptions
- `idx_categories_name` - Search category names

#### **Composite Indexes**
- `idx_apps_status_featured` - Filter active + featured
- `idx_apps_status_free` - Filter active + free
- `idx_apps_category_status` - Filter by category + status
- `idx_apps_rating_count_rating` - Sort by popularity + rating

#### **Related Table Indexes**
- `idx_screenshots_app_id` - Join screenshots
- `idx_screenshots_display_order` - Order screenshots
- `idx_categories_slug` - Lookup by slug
- `idx_ratings_app_id` - Join ratings
- `idx_ratings_rating` - Filter by rating
- `idx_ratings_created_at` - Sort by date

### **Optimized Views**

#### **1. ios_apps_view** - iOS app optimized data
```sql
SELECT 
    a.id, a.name, a.description, a.developer,
    a.category_id, a.price, a.currency, a.icon_url,
    a.app_store_url, a.website_url, a.version, a.size,
    a.rating, a.rating_count, a.release_date, a.last_updated,
    a.is_free, a.is_featured, a.status, a.created_at, a.updated_at,
    c.name as category_name, c.slug as category_slug,
    COALESCE(ar.average_rating, 0) as calculated_rating,
    COALESCE(ar.rating_count, 0) as calculated_rating_count
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN app_ratings ar ON a.id = ar.app_id
WHERE a.status = 'ACTIVE';
```

#### **2. featured_apps_view** - Featured apps
```sql
SELECT 
    a.id, a.name, a.description, a.developer, a.icon_url,
    a.rating, a.rating_count, a.is_free, a.price,
    a.category_id, c.name as category_name
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.is_featured = true AND a.status = 'ACTIVE'
ORDER BY a.rating_count DESC, a.rating DESC;
```

#### **3. free_apps_view** - Free apps
```sql
SELECT 
    a.id, a.name, a.description, a.developer, a.icon_url,
    a.rating, a.rating_count, a.category_id, c.name as category_name
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.is_free = true AND a.status = 'ACTIVE'
ORDER BY a.rating_count DESC, a.rating DESC;
```

#### **4. category_stats_view** - Category statistics
```sql
SELECT 
    c.id, c.name, c.slug, c.description,
    COUNT(a.id) as app_count,
    AVG(a.rating) as avg_rating,
    SUM(a.rating_count) as total_ratings,
    COUNT(CASE WHEN a.is_free = true THEN 1 END) as free_app_count,
    COUNT(CASE WHEN a.is_featured = true THEN 1 END) as featured_app_count
FROM categories c
LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'ACTIVE'
GROUP BY c.id, c.name, c.slug, c.description
ORDER BY app_count DESC;
```

#### **5. dashboard_analytics** - Dashboard metrics
```sql
SELECT 
    (SELECT COUNT(*) FROM apps WHERE status = 'ACTIVE') as total_active_apps,
    (SELECT COUNT(*) FROM apps WHERE is_featured = true AND status = 'ACTIVE') as featured_apps,
    (SELECT COUNT(*) FROM apps WHERE is_free = true AND status = 'ACTIVE') as free_apps,
    (SELECT COUNT(*) FROM categories) as total_categories,
    (SELECT COUNT(*) FROM apps WHERE created_at >= NOW() - INTERVAL '30 days') as new_apps_30_days,
    (SELECT AVG(rating) FROM apps WHERE rating IS NOT NULL AND status = 'ACTIVE') as avg_app_rating,
    (SELECT SUM(rating_count) FROM apps WHERE status = 'ACTIVE') as total_ratings;
```

## 🔧 **Functions and Triggers**

### **Core Functions**

#### **1. update_app_ratings()** - Auto-update app ratings
```sql
CREATE OR REPLACE FUNCTION update_app_ratings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE apps 
    SET rating = ar.average_rating, rating_count = ar.rating_count
    FROM app_ratings ar
    WHERE apps.id = ar.app_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **2. toggle_featured_app(app_uuid UUID)** - Toggle featured status
```sql
CREATE OR REPLACE FUNCTION toggle_featured_app(app_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE apps SET is_featured = NOT is_featured WHERE id = app_uuid;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

#### **3. get_trending_apps(limit_count INTEGER)** - Get trending apps
```sql
CREATE OR REPLACE FUNCTION get_trending_apps(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID, name TEXT, developer TEXT, icon_url TEXT,
    rating NUMERIC(3,2), rating_count INTEGER,
    is_free BOOLEAN, price NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.name, a.developer, a.icon_url, a.rating,
           a.rating_count, a.is_free, a.price
    FROM apps a
    WHERE a.status = 'ACTIVE' AND a.rating_count > 10
    ORDER BY a.rating_count DESC, a.rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

#### **4. get_new_releases(limit_count INTEGER)** - Get new releases
```sql
CREATE OR REPLACE FUNCTION get_new_releases(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID, name TEXT, developer TEXT, icon_url TEXT,
    rating NUMERIC(3,2), is_free BOOLEAN, price NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.name, a.developer, a.icon_url, a.rating,
           a.is_free, a.price, a.created_at
    FROM apps a
    WHERE a.status = 'ACTIVE' AND a.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY a.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

#### **5. search_apps(search_term TEXT, limit_count INTEGER)** - Full-text search
```sql
CREATE OR REPLACE FUNCTION search_apps(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID, name TEXT, developer TEXT, icon_url TEXT,
    rating NUMERIC(3,2), rating_count INTEGER,
    is_free BOOLEAN, price NUMERIC(10,2),
    category_name TEXT, search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.name, a.developer, a.icon_url, a.rating,
           a.rating_count, a.is_free, a.price, c.name as category_name,
           ts_rank(
               setweight(to_tsvector('english', a.name), 'A') ||
               setweight(to_tsvector('english', COALESCE(a.description, '')), 'B') ||
               setweight(to_tsvector('english', a.developer), 'C'),
               plainto_tsquery('english', search_term)
           ) as search_rank
    FROM apps a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'ACTIVE' 
        AND (
            to_tsvector('english', a.name) @@ plainto_tsquery('english', search_term) OR
            to_tsvector('english', COALESCE(a.description, '')) @@ plainto_tsquery('english', search_term) OR
            to_tsvector('english', a.developer) @@ plainto_tsquery('english', search_term)
        )
    ORDER BY search_rank DESC, a.rating_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

### **Triggers**

#### **1. trigger_update_app_ratings** - Auto-update ratings
```sql
CREATE TRIGGER trigger_update_app_ratings
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_ratings();
```

#### **2. update_apps_updated_at** - Auto-update timestamp
```sql
CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### **3. update_categories_updated_at** - Auto-update timestamp
```sql
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 🔐 **Security (RLS Policies)**

### **Apps Table**
- **Public Read**: All users can read apps
- **Authenticated Full Access**: Authenticated users have full CRUD access

### **Screenshots Table**
- **Public Read**: All users can view screenshots
- **Authenticated Full Access**: Authenticated users have full CRUD access

### **Categories Table**
- **Public Read**: All users can read categories
- **Authenticated Full Access**: Authenticated users have full CRUD access

### **Custom Metadata Table**
- **Public Read**: All users can read metadata
- **Authenticated Full Access**: Authenticated users have full CRUD access

### **Ratings Table**
- **Public Read**: All users can read ratings
- **Authenticated Full Access**: Authenticated users have full CRUD access

## 📊 **Storage Buckets**

### **Icons Bucket**
- **Name**: `icons`
- **Public**: Yes
- **Size Limit**: 5MB
- **MIME Types**: image/jpeg, image/png, image/gif, image/webp

### **Screenshots Bucket**
- **Name**: `screenshots`
- **Public**: Yes
- **Size Limit**: 10MB
- **MIME Types**: image/jpeg, image/png, image/gif, image/webp

## 🛠️ **Maintenance**

### **perform_maintenance() Function**
```sql
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Update statistics
    ANALYZE apps;
    ANALYZE categories;
    ANALYZE screenshots;
    ANALYZE ratings;
    
    -- Update app ratings
    UPDATE apps 
    SET rating = ar.average_rating, rating_count = ar.rating_count
    FROM app_ratings ar
    WHERE apps.id = ar.app_id;
    
    -- Update is_free flag
    UPDATE apps 
    SET is_free = (price = 0 OR price IS NULL) 
    WHERE is_free IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### **Recommended Maintenance Schedule**
- **Daily**: Run `perform_maintenance()` function
- **Weekly**: Check performance metrics view
- **Monthly**: Review and optimize slow queries

## 📈 **Performance Metrics**

### **Monitoring Views**
- **performance_metrics**: Database statistics and index usage
- **dashboard_analytics**: Key business metrics

### **Query Performance Tips**
1. **Use Views**: Leverage optimized views for common queries
2. **Index Usage**: Ensure queries use appropriate indexes
3. **Full-Text Search**: Use `search_apps()` function for text search
4. **Pagination**: Always limit result sets
5. **Caching**: Cache frequently accessed data

## 🔄 **Migration History**

### **Key Migrations**
1. **20240320000000_initial_schema.sql** - Initial database schema
2. **20240320000001_mas_import.sql** - Mac App Store integration
3. **20240320000002_admin_roles.sql** - Admin role management
4. **20240320000006_ios_integration.sql** - iOS app integration
5. **20240320000008_consolidated_optimization.sql** - Performance optimizations

### **Consolidated Features**
- ✅ Storage bucket setup
- ✅ Performance indexes (15+ indexes)
- ✅ Optimized views (5 views)
- ✅ Functions and triggers (6 functions)
- ✅ RLS policy cleanup
- ✅ Analytics and monitoring
- ✅ Maintenance functions

## 🚀 **Usage Examples**

### **Get Featured Apps**
```sql
SELECT * FROM featured_apps_view LIMIT 10;
```

### **Search Apps**
```sql
SELECT * FROM search_apps('photo editor', 20);
```

### **Get Trending Apps**
```sql
SELECT * FROM get_trending_apps(10);
```

### **Get Category Stats**
```sql
SELECT * FROM category_stats_view;
```

### **Get Dashboard Analytics**
```sql
SELECT * FROM dashboard_analytics;
```

## 📝 **Notes**

- All timestamps are in UTC
- UUIDs are used for all primary keys
- Full-text search supports English language
- Ratings are automatically calculated and cached
- Storage buckets are configured for public access
- RLS policies ensure proper access control
- Maintenance functions keep data consistent

---

**Last Updated**: March 20, 2024  
**Version**: 1.0  
**Database**: PostgreSQL 15+ with Supabase 