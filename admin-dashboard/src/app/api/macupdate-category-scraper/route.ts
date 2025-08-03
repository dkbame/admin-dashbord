import { NextRequest, NextResponse } from 'next/server'
import { MacUpdateCategoryScraper } from '@/lib/macupdate-scraper'

export const dynamic = 'force-dynamic'

// Set a maximum execution time to prevent timeouts
const MAX_EXECUTION_TIME = 15000 // Reduced to 15 seconds for ultra-fast mode

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { categoryUrl, limit = 10, preview = true } = await request.json() // Added preview option

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Scraping category with aggressive timeout handling:', categoryUrl, 'with limit:', limit, 'preview:', preview)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Check execution time more frequently
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Request timeout - operation taking too long')
      }
    }
    
    // Use the proper method that creates import sessions
    const result = await categoryScraper.getAppsUrlsOnly(categoryUrl, limit, 1)
    
    checkTimeout()
    
    let appPreviews = []
    
    // Only get preview data if requested and we have time
    if (preview) {
      // Get preview data for only the first few apps to avoid timeout - reduced to 3
      const maxPreviews = Math.min(3, result.appUrls.length) // Reduced from 5 to 3
      
      // If we have API data, use it directly (faster)
      if (result.apiData && result.apiData.apps) {
        for (let i = 0; i < Math.min(maxPreviews, result.apiData.apps.length); i++) {
          checkTimeout()
          const appData = result.apiData.apps[i]
          const preview = await categoryScraper.getAppPreviewFromAPI(appData)
          if (preview) {
            appPreviews.push({
              ...preview,
              url: preview.macupdate_url || ''
            })
          }
        }
      } else {
        // Fallback to individual page scraping (limited)
        for (let i = 0; i < maxPreviews; i++) {
          checkTimeout()
          const appUrl = result.appUrls[i]
          try {
            const preview = await categoryScraper.getAppPreview(appUrl)
            if (preview) {
              appPreviews.push({
                ...preview,
                url: appUrl
              })
            }
          } catch (error) {
            console.error('Error getting preview for:', appUrl, error)
          }
        }
      }
    }

    checkTimeout()

    // Import sessions are already created by getAppsUrlsOnly method

    const executionTime = Date.now() - startTime
    console.log(`Category scraping completed in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      categoryName: result.categoryName,
      totalApps: result.totalApps,
      newApps: result.newApps,
      existingApps: result.existingApps,
      appUrls: result.appUrls,
      appPreviews,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        processedPages: result.processedPages
      },
      executionTime,
      note: preview && appPreviews.length < result.appUrls.length ? 
        `Limited to ${appPreviews.length} previews to prevent timeout` : 
        preview ? 'All app previews retrieved' : 'Preview data skipped for speed'
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Category scraping error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category',
      executionTime,
      suggestion: 'Try reducing the limit, setting preview=false, or check the category URL'
    }, { status: 500 })
  }
}

// Ultra-fast mode - only scrape URLs, no database operations
export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { categoryUrl, limit = 10, reset = false, pages = 1 } = await request.json()

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Ultra-fast scraping category (URLs only):', categoryUrl, 'with limit:', limit, 'reset:', reset)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // If reset is requested, clear import sessions first
    if (reset) {
      console.log('🔄 Manual reset requested, clearing import sessions...')
      await categoryScraper.clearImportSessionsForCategory(categoryUrl)
    }
    
    // Ultra-fast mode: only get URLs, skip all database operations
    const result = await categoryScraper.getAppsUrlsOnly(categoryUrl, limit, pages)
    
    const executionTime = Date.now() - startTime
    console.log(`Ultra-fast category scraping completed in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      categoryName: result.categoryName,
      totalApps: result.totalApps,
      newApps: result.newApps,
      existingApps: result.existingApps,
      appUrls: result.appUrls,
      appPreviews: [], // No preview data for maximum speed
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        processedPages: result.processedPages
      },
      executionTime,
      note: reset ? 
        'Ultra-fast mode - URLs only, page tracking reset' : 
        'Ultra-fast mode - URLs only, no database operations or preview data'
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Ultra-fast category scraping error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category',
      executionTime,
      suggestion: 'Check the category URL or try a different category'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const categoryUrl = searchParams.get('url')
    const limit = parseInt(searchParams.get('limit') || '10') // Reduced default limit
    const preview = searchParams.get('preview') !== 'false' // Default to true unless explicitly false

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Scraping category for NEW apps only (GET) with aggressive timeout protection:', categoryUrl, 'with limit:', limit, 'preview:', preview)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Check execution time more frequently
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Request timeout - operation taking too long')
      }
    }
    
    // Use the new pagination method that gets the next unprocessed page
    const result = await categoryScraper.getNewAppsOnlyWithPagination(categoryUrl, limit)
    
    checkTimeout()
    
    let appPreviews = []
    
    // Only get preview data if requested and we have time
    if (preview) {
      // Get preview data for only the first few apps to avoid timeout - reduced to 3
      const maxPreviews = Math.min(3, result.appUrls.length) // Reduced from 5 to 3
      
      for (let i = 0; i < maxPreviews; i++) {
        checkTimeout()
        const appUrl = result.appUrls[i]
        try {
          const preview = await categoryScraper.getAppPreview(appUrl)
          if (preview) {
            appPreviews.push({
              ...preview,
              url: appUrl
            })
          }
        } catch (error) {
          console.error('Error getting preview for:', appUrl, error)
        }
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`GET category scraping completed in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      categoryName: result.categoryName,
      totalApps: result.totalApps,
      newApps: result.newApps,
      existingApps: result.existingApps,
      appUrls: result.appUrls,
      appPreviews,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        processedPages: result.processedPages
      },
      executionTime,
      note: preview && appPreviews.length < result.appUrls.length ? 
        `Limited to ${appPreviews.length} previews to prevent timeout` : 
        preview ? 'All app previews retrieved' : 'Preview data skipped for speed'
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Category scraping error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category',
      executionTime,
      suggestion: 'Try reducing the limit, setting preview=false, or check the category URL'
    }, { status: 500 })
  }
} 