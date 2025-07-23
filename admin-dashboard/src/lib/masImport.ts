import { supabase } from './supabase'

export interface MASApp {
  id: string
  name: string
  developer: string
  description: string
  price: number
  currency: string
  category: string
  screenshots: string[]
  icon: string
  minimumOSVersion: string
  lastUpdated: string
  features: string[]
  ratings: {
    average: number
    count: number
  }
  version: string
  size: number
  releaseDate: string
}

// Function to scrape ratings from App Store page via our API
async function scrapeAppStoreRatings(url: string): Promise<{ average: number, count: number }> {
  try {
    console.log('Scraping ratings via API from:', url)
    
    const response = await fetch(`/api/scrape-rating?url=${encodeURIComponent(url)}`)
    
    if (!response.ok) {
      throw new Error(`Scraping API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Scraping failed: ${data.error}`)
    }
    
    console.log('API scraping result:', data)
    return { average: data.average || 0, count: data.count || 0 }
  } catch (error) {
    console.error('Error scraping App Store ratings via API:', error)
    return { average: 0, count: 0 }
  }
}

// Category mapping from iTunes to our database categories
const categoryMapping: { [key: string]: string } = {
  'Productivity': 'Productivity',
  'Developer Tools': 'Developer Tools',
  'Design': 'Design',
  'Graphics & Design': 'Graphics & Design',
  'Utilities': 'Utilities',
  'Entertainment': 'Entertainment',
  'Education': 'Education',
  'Business': 'Business',
  'Video & Audio': 'Video & Audio',
  'Social Networking': 'Social Networking',
  'Games': 'Games',
  'Health & Fitness': 'Health & Fitness',
  'Lifestyle': 'Lifestyle',
  'Finance': 'Finance',
  'Reference': 'Reference',
  'Music': 'Music',
  'Photo & Video': 'Photo & Video',
  'News': 'News',
  'Weather': 'Weather',
  'Travel': 'Travel',
  'Sports': 'Sports',
  'Medical': 'Medical',
  'Food & Drink': 'Food & Drink',
  'Shopping': 'Shopping',
  'Navigation': 'Navigation',
  'Book': 'Book',
  'Magazine': 'Magazine',
  'Catalogs': 'Catalogs',
  'Newsstand': 'Newsstand',
}

async function getCategoryId(categoryName: string): Promise<string | null> {
  try {
    // First try exact match
    let { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single()

    if (data) {
      return data.id
    }

    // Try mapped category
    const mappedCategory = categoryMapping[categoryName]
    if (mappedCategory) {
      const { data: mappedData, error: mappedError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', mappedCategory)
        .single()

      if (mappedData) {
        return mappedData.id
      }
    }

    // Try partial match (case insensitive)
    const { data: partialData, error: partialError } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', `%${categoryName}%`)
      .single()

    if (partialData) {
      return partialData.id
    }

    // If no match found, return null (app will be uncategorized)
    return null
  } catch (error) {
    console.error('Error finding category:', error)
    return null
  }
}

export async function importFromMAS(url: string): Promise<MASApp | null> {
  try {
    // Enhanced URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required')
    }

    // Validate URL format
    const urlPattern = /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[^\/]+\/id\d+/
    if (!urlPattern.test(url)) {
      throw new Error('Invalid Mac App Store URL format. Expected: https://apps.apple.com/.../id[number]')
    }

    // Extract app ID from URL
    const appId = url.match(/id(\d+)/)?.[1]
    if (!appId) {
      throw new Error('Could not extract app ID from URL')
    }

    console.log('Importing app with ID:', appId)

    // Check if app already exists
    const { data: existingApp, error: checkError } = await supabase
      .from('apps')
      .select('id, name, mas_id')
      .eq('mas_id', appId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing app:', checkError)
      throw new Error('Failed to check for existing app')
    }

    if (existingApp) {
      throw new Error(`App "${existingApp.name}" already exists in the database`)
    }

    // Fetch app data from iTunes API via backend proxy to avoid CORS
    const response = await fetch(`/api/itunes?id=${appId}`)
    
    if (!response.ok) {
      throw new Error(`iTunes API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()

    console.log('Raw iTunes API response:', JSON.stringify(data, null, 2))

    if (!data.results || data.results.length === 0) {
      throw new Error('App not found in iTunes database')
    }

    const app = data.results[0]

    // Validate required fields
    if (!app.trackName || !app.artistName) {
      throw new Error('App data is incomplete: missing name or developer')
    }

    // Scrape ratings from the actual App Store page since iTunes API doesn't provide them for Mac apps
    let scrapedRating = { average: 0, count: 0 }
    try {
      console.log('Scraping ratings from App Store page:', url)
      const scrapedData = await scrapeAppStoreRatings(url)
      if (scrapedData.average > 0) {
        scrapedRating = scrapedData
        console.log('Successfully scraped ratings:', scrapedRating)
      }
    } catch (scrapeError) {
      console.warn('Failed to scrape ratings from App Store page:', scrapeError)
      // Continue with iTunes API data (which will be 0 for Mac apps)
    }

    console.log('iTunes app data:', {
      trackId: app.trackId,
      trackName: app.trackName,
      artistName: app.artistName,
      version: app.version,
      fileSizeBytes: app.fileSizeBytes,
      averageUserRating: app.averageUserRating,
      userRatingCount: app.userRatingCount,
      // Add more detailed rating logging
      averageUserRatingForCurrentVersion: app.averageUserRatingForCurrentVersion,
      userRatingCountForCurrentVersion: app.userRatingCountForCurrentVersion,
      trackViewUrl: app.trackViewUrl,
      releaseDate: app.releaseDate,
      currentVersionReleaseDate: app.currentVersionReleaseDate,
      price: app.price,
      currency: app.currency,
      primaryGenreName: app.primaryGenreName,
      minimumOsVersion: app.minimumOsVersion,
      features: app.features,
      screenshotUrls: app.screenshotUrls?.length || 0,
      artworkUrl512: app.artworkUrl512,
      artworkUrl100: app.artworkUrl100
    })

    // Get category ID
    const categoryId = await getCategoryId(app.primaryGenreName)
    console.log('Category ID:', categoryId)

    // Transform iTunes API data to our format
    const transformedApp: MASApp = {
      id: app.trackId.toString(),
      name: app.trackName,
      developer: app.artistName,
      description: app.description,
      price: app.price,
      currency: app.currency,
      category: app.primaryGenreName,
      screenshots: app.screenshotUrls || [],
      icon: app.artworkUrl512 || app.artworkUrl100,
      minimumOSVersion: app.minimumOsVersion,
      lastUpdated: app.currentVersionReleaseDate,
      features: app.features || [],
      ratings: {
        average: scrapedRating.average > 0 ? scrapedRating.average : (app.averageUserRatingForCurrentVersion || app.averageUserRating || 0),
        count: scrapedRating.count > 0 ? scrapedRating.count : (app.userRatingCountForCurrentVersion || app.userRatingCount || 0),
      },
      // Add missing fields
      version: app.version || '',
      size: app.fileSizeBytes || 0,
      releaseDate: app.releaseDate || app.currentVersionReleaseDate || '',
    }

    console.log('Transformed app data:', transformedApp)

    // Debug rating transformation specifically
    console.log('Rating transformation debug:', {
      originalRating: app.averageUserRating,
      originalCount: app.userRatingCount,
      currentVersionRating: app.averageUserRatingForCurrentVersion,
      currentVersionCount: app.userRatingCountForCurrentVersion,
      finalRating: transformedApp.ratings.average,
      finalCount: transformedApp.ratings.count
    })

    // Prepare data for database insertion
    const appData = {
        name: transformedApp.name,
        developer: transformedApp.developer,
        description: transformedApp.description,
        price: transformedApp.price,
        currency: transformedApp.currency,
        category_id: categoryId, // Add category mapping
        is_on_mas: true,
        mas_id: transformedApp.id,
        mas_url: url,
        icon_url: transformedApp.icon,
        minimum_os_version: transformedApp.minimumOSVersion,
        last_updated: transformedApp.lastUpdated,
        features: transformedApp.features,
        status: 'ACTIVE',
        source: 'MAS',
        // Add the missing fields
        version: transformedApp.version,
        size: transformedApp.size,
        rating: transformedApp.ratings.average,
        rating_count: transformedApp.ratings.count,
        release_date: transformedApp.releaseDate,
        is_free: transformedApp.price === 0, // Calculate is_free based on price
        app_store_url: url, // Add the Mac App Store URL
        is_featured: false, // Default to not featured, can be changed manually later
    }

    console.log('Data being inserted into database:', appData)

    // Debug database rating insertion specifically
    console.log('Database rating insertion debug:', {
      rating: appData.rating,
      rating_count: appData.rating_count,
      is_free: appData.is_free,
      price: appData.price
    })

    // Save to Supabase with proper error handling
    const { data: savedApp, error } = await supabase.from('apps').insert([appData]).select()

    if (error) {
      console.error('Database error:', error)
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This app already exists in the database')
      } else if (error.code === '23502') { // Not null violation
        throw new Error('Required app data is missing')
      } else if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid category reference')
      } else {
        throw new Error(`Database error: ${error.message}`)
      }
    }

    if (!savedApp || savedApp.length === 0) {
      throw new Error('Failed to save app to database')
    }

    console.log('Saved app to database:', savedApp[0])

    // Save screenshots if available
    if (transformedApp.screenshots.length > 0) {
      try {
        const screenshotsToInsert = transformedApp.screenshots.map(
          (url, index) => ({
            app_id: savedApp[0].id,
            url,
            display_order: index + 1,
          })
        )

        const { error: screenshotError } = await supabase
          .from('screenshots')
          .insert(screenshotsToInsert)

        if (screenshotError) {
          console.error('Error saving screenshots:', screenshotError)
          // Don't throw error for screenshots, app is still saved
        } else {
          console.log(`Successfully saved ${screenshotsToInsert.length} screenshots`)
        }
      } catch (screenshotErr) {
        console.error('Error processing screenshots:', screenshotErr)
        // Continue without screenshots
      }
    }

    return transformedApp
  } catch (error) {
    console.error('Error importing from MAS:', error)
    throw error // Re-throw to show in UI
  }
} 