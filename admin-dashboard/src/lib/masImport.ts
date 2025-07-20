import { supabase } from './supabase'

interface MASApp {
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
  // Add missing fields
  version: string
  size: number
  releaseDate: string
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
    // Extract app ID from URL
    const appId = url.match(/id(\d+)/)?.[1]
    if (!appId) {
      throw new Error('Invalid Mac App Store URL')
    }

    console.log('Importing app with ID:', appId)

    // Fetch app data from iTunes API via backend proxy to avoid CORS
    const response = await fetch(`/api/itunes?id=${appId}`)
    const data = await response.json()

    console.log('Raw iTunes API response:', JSON.stringify(data, null, 2))

    if (!data.results?.[0]) {
      throw new Error('App not found')
    }

    const app = data.results[0]

    console.log('iTunes app data:', {
      trackId: app.trackId,
      trackName: app.trackName,
      artistName: app.artistName,
      version: app.version,
      fileSizeBytes: app.fileSizeBytes,
      averageUserRating: app.averageUserRating,
      userRatingCount: app.userRatingCount,
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
        average: app.averageUserRating || 0,
        count: app.userRatingCount || 0,
      },
      // Add missing fields
      version: app.version || '',
      size: app.fileSizeBytes || 0,
      releaseDate: app.releaseDate || app.currentVersionReleaseDate || '',
    }

    console.log('Transformed app data:', transformedApp)

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
    }

    console.log('Data being inserted into database:', appData)

    // Save to Supabase with proper error handling
    const { data: savedApp, error } = await supabase.from('apps').insert([appData]).select()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Database error: ${error.message}`)
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