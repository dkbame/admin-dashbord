import { NextRequest, NextResponse } from 'next/server'
import { MacUpdateCategoryScraper } from '@/lib/macupdate-scraper'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { categoryUrl, limit = 20 } = await request.json()

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Scraping category using MacUpdate API:', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Use the new API method for reliable pagination
    const result = await categoryScraper.getAppsFromAPI(categoryUrl, limit)
    
    // Get preview data for each new app
    const appPreviews = []
    for (const appUrl of result.appUrls) { // Show all apps in the batch
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

    // Mark this batch as processed only if there are apps to process
    if (result.newApps > 0) {
      await categoryScraper.markAppsAsProcessed(categoryUrl, result.newApps, result.categoryName)
    } else {
      console.log('No new apps to process, skipping import session creation')
    }

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
      }
    })

  } catch (error) {
    console.error('Category scraping error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryUrl = searchParams.get('url')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Scraping category for NEW apps only (GET):', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Use the new pagination method that gets the next unprocessed page
    const result = await categoryScraper.getNewAppsOnlyWithPagination(categoryUrl, limit)
    
    // Get preview data for each new app
    const appPreviews = []
    for (const appUrl of result.appUrls) { // Show all apps, not just first 10
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
      }
    })

  } catch (error) {
    console.error('Category scraping error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category'
    }, { status: 500 })
  }
} 