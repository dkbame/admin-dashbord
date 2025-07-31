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

    console.log('Scraping category for NEW apps only:', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Use the new method that only returns apps that don't exist in database
    const result = await categoryScraper.getNewAppsOnly(categoryUrl, limit)
    
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
      appPreviews
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
    
    // Use the new method that only returns apps that don't exist in database
    const result = await categoryScraper.getNewAppsOnly(categoryUrl, limit)
    
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
      appPreviews
    })

  } catch (error) {
    console.error('Category scraping error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to scrape category'
    }, { status: 500 })
  }
} 