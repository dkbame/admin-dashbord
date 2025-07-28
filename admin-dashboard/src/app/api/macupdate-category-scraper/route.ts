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

    console.log('Scraping category:', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Scrape the category page
    const result = await categoryScraper.scrapeCategoryPage(categoryUrl, limit)
    
    // Get preview data for each app
    const appPreviews = []
    for (const appUrl of result.appUrls.slice(0, 10)) { // Limit previews to 10 for performance
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

    console.log('Scraping category (GET):', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Scrape the category page
    const result = await categoryScraper.scrapeCategoryPage(categoryUrl, limit)
    
    // Get preview data for each app
    const appPreviews = []
    for (const appUrl of result.appUrls.slice(0, 10)) { // Limit previews to 10 for performance
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