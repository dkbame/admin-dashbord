import { NextRequest, NextResponse } from 'next/server'
import { MacUpdateCategoryScraper } from '@/lib/macupdate-scraper'

export const dynamic = 'force-dynamic'

// Set a maximum execution time to prevent timeouts
const MAX_EXECUTION_TIME = 20000 // Reduced to 20 seconds (leaving 10 seconds buffer for Netlify's 30s limit)

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
    
    // Use HTML scraping with reduced workload
    const result = await categoryScraper.getAppsFromAPI(categoryUrl, limit)
    
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

    // Mark this batch as processed only if there are apps to process
    if (result.newApps > 0) {
      await categoryScraper.markAppsAsProcessed(categoryUrl, result.newApps, result.categoryName)
    } else {
      console.log('No new apps to process, skipping import session creation')
    }

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

// New PUT method for maximum speed - no preview data at all
export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { categoryUrl, limit = 10 } = await request.json()

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Fast scraping category (no previews):', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Use HTML scraping with reduced workload
    const result = await categoryScraper.getAppsFromAPI(categoryUrl, limit)
    
    // Mark this batch as processed only if there are apps to process
    if (result.newApps > 0) {
      await categoryScraper.markAppsAsProcessed(categoryUrl, result.newApps, result.categoryName)
    } else {
      console.log('No new apps to process, skipping import session creation')
    }

    const executionTime = Date.now() - startTime
    console.log(`Fast category scraping completed in ${executionTime}ms`)

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
      note: 'Fast mode - no preview data retrieved for maximum speed and reliability'
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Fast category scraping error:', error, `(execution time: ${executionTime}ms)`)
    
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