import { createClient } from '@supabase/supabase-js'
import { MacUpdateApp } from './macupdate-scraper'

// Initialize Supabase client - use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Category mapping from MacUpdate to our database
const CATEGORY_MAP: { [key: string]: string } = {
  // Productivity
  'productivity': 'productivity',
  'office': 'productivity',
  'word processing': 'productivity',
  'spreadsheets': 'productivity',
  'presentation': 'productivity',
  'project management': 'productivity',
  'ai': 'productivity',
  'artificial intelligence': 'productivity',
  
  // Development
  'development': 'development',
  'developer tools': 'development',
  'programming': 'development',
  'coding': 'development',
  'web development': 'development',
  'software development': 'development',
  
  // Graphics & Design
  'graphics': 'graphics-design',
  'graphic design': 'graphics-design',
  'graphic-design': 'graphics-design',
  'design': 'graphics-design',
  'photography': 'graphics-design',
  'image editing': 'graphics-design',
  'photo editing': 'graphics-design',
  'illustration': 'graphics-design',
  'drawing': 'graphics-design',
  '3d': 'graphics-design',
  '3d modeling': 'graphics-design',
  'cad': 'graphics-design',
  'vector': 'graphics-design',
  'typography': 'graphics-design',
  'layout': 'graphics-design',
  'publishing': 'graphics-design',
  
  // Video & Audio
  'video': 'video-audio',
  'audio': 'video-audio',
  'music': 'video-audio',
  'music & audio': 'video-audio',
  'video editing': 'video-audio',
  'audio editing': 'video-audio',
  'media': 'video-audio',
  'streaming': 'video-audio',
  'podcast': 'video-audio',
  
  // Utilities
  'utilities': 'utilities',
  'system utilities': 'utilities',
  'internet utilities': 'utilities',
  'browsing': 'utilities',
  'customization': 'utilities',
  'system': 'utilities',
  'maintenance': 'utilities',
  'backup': 'utilities',
  'file management': 'utilities',
  'disk utilities': 'utilities',
  
  // Entertainment
  'entertainment': 'entertainment',
  'media player': 'entertainment',
  'tv': 'entertainment',
  'movies': 'entertainment',
  
  // Games
  'games': 'games',
  'gaming': 'games',
  'game': 'games',
  
  // Business
  'business': 'business',
  'enterprise': 'business',
  'accounting': 'business',
  'crm': 'business',
  
  // Education
  'education': 'education',
  'learning': 'education',
  'tutorial': 'education',
  'training': 'education',
  'academic': 'education',
  
  // Social Networking
  'social': 'social-networking',
  'social networking': 'social-networking',
  'communication': 'social-networking',
  'messaging': 'social-networking',
  'chat': 'social-networking',
  
  // Health & Fitness
  'health': 'health-fitness',
  'health & fitness': 'health-fitness',
  'fitness': 'health-fitness',
  'medical': 'health-fitness',
  'medical software': 'health-fitness',
  'wellness': 'health-fitness',
  
  // Lifestyle
  'lifestyle': 'lifestyle',
  'lifestyle & hobby': 'lifestyle',
  'hobby': 'lifestyle',
  'travel': 'lifestyle',
  'cooking': 'lifestyle',
  'home': 'lifestyle',
  
  // Finance
  'finance': 'finance',
  'financial': 'finance',
  'banking': 'finance',
  'investment': 'finance',
  'budget': 'finance',
  
  // Security
  'security': 'security',
  'antivirus': 'security',
  'firewall': 'security',
  'encryption': 'security',
  'privacy': 'security',
  
  // Reference
  'reference': 'reference',
  'dictionary': 'reference',
  'encyclopedia': 'reference',
  'research': 'reference',
  'documentation': 'reference'
}

export interface ImportResult {
  success: boolean
  appId?: string
  message: string
  isNew: boolean
  screenshots?: number
  metadata?: boolean
}

export interface BatchImportResult {
  total: number
  successful: number
  failed: number
  results: ImportResult[]
}

// Get category ID by name
async function getCategoryId(categoryName: string): Promise<string | null> {
  try {
    console.log('Mapping category:', categoryName)
    
    // Map MacUpdate category to our category slug
    const searchTerm = categoryName.toLowerCase().trim()
    let targetSlug = 'utilities' // default fallback
    
    // First try exact matches
    if (CATEGORY_MAP[searchTerm]) {
      targetSlug = CATEGORY_MAP[searchTerm]
      console.log('Exact match found:', searchTerm, '->', targetSlug)
    } else {
      // Try partial matches
      for (const [key, slug] of Object.entries(CATEGORY_MAP)) {
        if (searchTerm.includes(key) || key.includes(searchTerm)) {
          targetSlug = slug
          console.log('Partial match found:', searchTerm, 'includes', key, '->', targetSlug)
          break
        }
      }
    }
    
    console.log('Final target slug:', targetSlug)
    
    // Get category ID from database
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', targetSlug)
      .single()
    
    if (error) {
      console.error('Error fetching category:', error)
      return null
    }
    
    console.log('Category ID found:', categories?.id)
    return categories?.id || null
  } catch (error) {
    console.error('Error in getCategoryId:', error)
    return null
  }
}

// Check if app already exists by name and MacUpdate URL
async function checkAppExists(appName: string, macupdateUrl: string): Promise<string | null> {
  try {
    // First try to find by exact name and MacUpdate URL
    const { data, error } = await supabase
      .from('apps')
      .select('id')
      .eq('name', appName)
      .eq('website_url', macupdateUrl)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking app existence:', error)
      return null
    }
    
    if (data?.id) {
      return data.id
    }
    
    // Fallback: check by name only (in case URL changed)
    const { data: nameData, error: nameError } = await supabase
      .from('apps')
      .select('id')
      .eq('name', appName)
      .eq('source', 'CUSTOM')
      .single()
    
    if (nameError && nameError.code !== 'PGRST116') {
      console.error('Error checking app existence by name:', nameError)
      return null
    }
    
    return nameData?.id || null
  } catch (error) {
    console.error('Error in checkAppExists:', error)
    return null
  }
}

// Import single app to database
export async function importMacUpdateApp(app: MacUpdateApp): Promise<ImportResult> {
  try {
    // Check if app already exists
    const existingAppId = await checkAppExists(app.name, app.macupdate_url)
    
    if (existingAppId) {
      return {
        success: true,
        appId: existingAppId,
        message: 'App already exists in database',
        isNew: false
      }
    }
    
    // Get category ID
    const categoryId = await getCategoryId(app.category)
    
    // Prepare app data for database
    const appData = {
      name: app.name,
      developer: app.developer,
      description: app.description || '',
      category_id: categoryId,
      price: app.price || 0,
      currency: app.currency || 'USD',
      rating: null, // Skip ratings - will use our own rating system
      rating_count: 0, // Skip rating count - will use our own rating system
      version: app.version || '',
      is_on_mas: false, // MacUpdate apps are not from App Store
      mas_id: null,
      mas_url: null,
      app_store_url: null,
              website_url: app.developer_website_url || app.macupdate_url || '',
      download_url: null, // Leave download URL empty for MacUpdate apps
      icon_url: app.icon_url || null,
      minimum_os_version: app.system_requirements && app.system_requirements.length > 0 ? app.system_requirements[0] : null,
      size: app.file_size || null,
      architecture: app.architecture || null,
      release_date: null, // Leave empty - MacUpdate shows "Updated on" not release date
      is_free: app.price === 0,
      is_featured: false,
      features: [],
      source: 'CUSTOM',
      status: 'ACTIVE',
      last_updated: app.last_updated || new Date()
    }
    
    // Insert app into database
    const { data: newApp, error: appError } = await supabase
      .from('apps')
      .insert(appData)
      .select()
      .single()
    
    if (appError) {
      console.error('Error inserting app:', appError)
      return {
        success: false,
        message: `Failed to insert app: ${appError.message}`,
        isNew: false
      }
    }
    
    let screenshotsCount = 0
    let metadataSaved = false
    
    // Save screenshots if available
    if (app.screenshots && app.screenshots.length > 0) {
      for (let i = 0; i < app.screenshots.length; i++) {
        const screenshot = app.screenshots[i]
        try {
          const screenshotData = {
            app_id: newApp.id,
            url: screenshot,
            display_order: i + 1,
            caption: `${app.name} Screenshot ${i + 1}`
          }
          
          const { error: screenshotError } = await supabase
            .from('screenshots')
            .insert(screenshotData)
          
          if (!screenshotError) {
            screenshotsCount++
          }
        } catch (error) {
          console.error(`Failed to save screenshot ${i + 1} for ${app.name}:`, error)
        }
      }
    }
    
    // Save additional metadata if available
    if (app.system_requirements && app.system_requirements.length > 0) {
      try {
        const metadataData = {
          app_id: newApp.id,
          system_requirements: app.system_requirements
        }
        
        const { error: metadataError } = await supabase
          .from('custom_metadata')
          .insert(metadataData)
        
        if (!metadataError) {
          metadataSaved = true
        }
      } catch (error) {
        console.error(`Failed to save metadata for ${app.name}:`, error)
      }
    }
    
    return {
      success: true,
      appId: newApp.id,
      message: `Successfully imported ${app.name}`,
      isNew: true,
      screenshots: screenshotsCount,
      metadata: metadataSaved
    }
    
  } catch (error) {
    console.error('Error importing MacUpdate app:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      isNew: false
    }
  }
}

// Import multiple apps in batch
export async function importMacUpdateAppsBatch(apps: MacUpdateApp[]): Promise<BatchImportResult> {
  const results: ImportResult[] = []
  let successful = 0
  let failed = 0
  
  for (const app of apps) {
    try {
      const result = await importMacUpdateApp(app)
      results.push(result)
      
      if (result.success) {
        successful++
      } else {
        failed++
      }
      
      // Add small delay between imports to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Error importing app ${app.name}:`, error)
      results.push({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        isNew: false
      })
      failed++
    }
  }
  
  return {
    total: apps.length,
    successful,
    failed,
    results
  }
}

// Get import statistics
export async function getImportStats(): Promise<{
  totalApps: number
  macUpdateApps: number
  recentImports: number
}> {
  try {
    // Get total apps
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
    
    // Get MacUpdate apps (source = 'CUSTOM' and website_url contains macupdate)
    const { count: macUpdateApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'CUSTOM')
      .ilike('website_url', '%macupdate%')
    
    // Get recent imports (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { count: recentImports } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
    
    return {
      totalApps: totalApps || 0,
      macUpdateApps: macUpdateApps || 0,
      recentImports: recentImports || 0
    }
    
  } catch (error) {
    console.error('Error getting import stats:', error)
    return {
      totalApps: 0,
      macUpdateApps: 0,
      recentImports: 0
    }
  }
}

// Function to find and clean up duplicate apps
export async function findDuplicateApps(): Promise<{
  duplicates: Array<{
    name: string
    count: number
    appIds: string[]
    developers: string[]
  }>
  totalDuplicates: number
}> {
  try {
    // Find apps with the same name but different developers
    const { data, error } = await supabase
      .from('apps')
      .select('id, name, developer, created_at, icon_url')
      .eq('source', 'CUSTOM')
      .order('name')
    
    if (error) {
      console.error('Error finding duplicates:', error)
      return { duplicates: [], totalDuplicates: 0 }
    }
    
    // Group by name and find duplicates
    const groupedByName: { [key: string]: any[] } = {}
    data?.forEach(app => {
      if (!groupedByName[app.name]) {
        groupedByName[app.name] = []
      }
      groupedByName[app.name].push(app)
    })
    
    const duplicates = Object.entries(groupedByName)
      .filter(([name, apps]) => apps.length > 1)
      .map(([name, apps]) => ({
        name,
        count: apps.length,
        appIds: apps.map(app => app.id),
        developers: apps.map(app => app.developer)
      }))
    
    return {
      duplicates,
      totalDuplicates: duplicates.reduce((sum, group) => sum + group.count - 1, 0)
    }
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return { duplicates: [], totalDuplicates: 0 }
  }
}

// Function to remove duplicate apps (keeps the one with the most complete data)
export async function removeDuplicateApps(): Promise<{
  removed: number
  kept: number
  errors: string[]
}> {
  try {
    const { duplicates } = await findDuplicateApps()
    let removed = 0
    let kept = 0
    const errors: string[] = []
    
    for (const duplicate of duplicates) {
      // Sort by completeness (prefer apps with icons and more recent data)
      const sortedApps = duplicate.appIds.map((id, index) => ({
        id,
        developer: duplicate.developers[index]
      }))
      
      // Keep the first one, remove the rest
      const toKeep = sortedApps[0]
      const toRemove = sortedApps.slice(1)
      
      for (const appToRemove of toRemove) {
        const { error } = await supabase
          .from('apps')
          .delete()
          .eq('id', appToRemove.id)
        
        if (error) {
          errors.push(`Failed to remove duplicate ${appToRemove.id}: ${error.message}`)
        } else {
          removed++
        }
      }
      
      kept++
    }
    
    return { removed, kept, errors }
  } catch (error) {
    console.error('Error removing duplicates:', error)
    return { removed: 0, kept: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}