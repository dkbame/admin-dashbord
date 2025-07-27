import { NextRequest, NextResponse } from 'next/server'
import { createMacUpdateScraper } from '@/lib/macupdate-scraper'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testUrl = searchParams.get('url') || 'https://istat-menus.macupdate.com/'
    
    console.log('Testing MacUpdate scraper with URL:', testUrl)
    
    // Create scraper instance with minimal config
    const scraper = createMacUpdateScraper({
      pageLimit: 1,
      delayBetweenRequests: 1000,
      timeout: 30000 // Increased timeout for better reliability
    })

    try {
      // Test scraping a single app page
      const app = await scraper.scrapeAppPage(testUrl)
      
      if (app) {
        return NextResponse.json({
          success: true,
          app,
          message: 'Successfully scraped app page',
          debug: {
            url: testUrl,
            extractedData: {
              name: app.name,
              developer: app.developer,
              version: app.version,
              price: app.price,
              rating: app.rating,
              category: app.category,
              descriptionLength: app.description?.length || 0,
              screenshotsCount: app.screenshots?.length || 0
            }
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to scrape app page - no data returned',
          debug: {
            url: testUrl,
            message: 'No app data extracted from page'
          }
        })
      }

    } finally {
      // Always close the browser
      await scraper.close()
    }

  } catch (error) {
    console.error('MacUpdate test error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : undefined,
        debug: {
          url: new URL(request.url).searchParams.get('url') || 'https://istat-menus.macupdate.com/',
          message: 'Exception occurred during scraping'
        }
      },
      { status: 500 }
    )
  }
} 