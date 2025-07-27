import { NextRequest, NextResponse } from 'next/server'
import { createMacUpdateScraper, MacUpdateApp, ScrapingConfig } from '@/lib/macupdate-scraper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action = 'scrape-listings',
      config = {},
      appUrl = null 
    } = body

    // Validate action
    if (!['scrape-listings', 'scrape-app'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "scrape-listings" or "scrape-app"' },
        { status: 400 }
      )
    }

    // Create scraper instance
    const scraper = createMacUpdateScraper(config)

    try {
      if (action === 'scrape-listings') {
        // Scrape listing pages
        const result = await scraper.scrapeListings(config)
        
        return NextResponse.json({
          success: result.success,
          apps: result.apps,
          totalFound: result.totalFound,
          errors: result.errors,
          warnings: result.warnings
        })

      } else if (action === 'scrape-app' && appUrl) {
        // Scrape individual app page
        const app = await scraper.scrapeAppPage(appUrl)
        
        if (app) {
          return NextResponse.json({
            success: true,
            app
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to scrape app page'
          })
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'App URL is required for scrape-app action' },
          { status: 400 }
        )
      }

    } finally {
      // Always close the browser
      await scraper.close()
    }

  } catch (error) {
    console.error('MacUpdate scraper error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'scrape-listings'
    const appUrl = searchParams.get('appUrl')
    
    // Parse config from query parameters
    const config: Partial<ScrapingConfig> = {
      pageLimit: parseInt(searchParams.get('pageLimit') || '2'),
      minRating: parseFloat(searchParams.get('minRating') || '0'),
      priceFilter: (searchParams.get('priceFilter') as 'all' | 'free' | 'paid') || 'all',
      category: searchParams.get('category') || 'all',
      delayBetweenRequests: parseInt(searchParams.get('delayBetweenRequests') || '2000'),
      timeout: parseInt(searchParams.get('timeout') || '30000')
    }

    // Validate action
    if (!['scrape-listings', 'scrape-app'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "scrape-listings" or "scrape-app"' },
        { status: 400 }
      )
    }

    // Create scraper instance
    const scraper = createMacUpdateScraper(config)

    try {
      if (action === 'scrape-listings') {
        // Scrape listing pages
        const result = await scraper.scrapeListings(config)
        
        return NextResponse.json({
          success: result.success,
          apps: result.apps,
          totalFound: result.totalFound,
          errors: result.errors,
          warnings: result.warnings
        })

      } else if (action === 'scrape-app' && appUrl) {
        // Scrape individual app page
        const app = await scraper.scrapeAppPage(appUrl)
        
        if (app) {
          return NextResponse.json({
            success: true,
            app
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to scrape app page'
          })
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'App URL is required for scrape-app action' },
          { status: 400 }
        )
      }

    } finally {
      // Always close the browser
      await scraper.close()
    }

  } catch (error) {
    console.error('MacUpdate scraper error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 