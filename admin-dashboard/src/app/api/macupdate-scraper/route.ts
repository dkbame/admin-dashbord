import { NextRequest, NextResponse } from 'next/server'
import { createMacUpdateScraper, MacUpdateApp, ScrapingConfig } from '@/lib/macupdate-scraper'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, appUrl, ...config } = body

    // Validate action
    if (!['scrape-listings', 'scrape-app'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "scrape-listings" or "scrape-app"' },
        { status: 400 }
      )
    }

    // Create scraper instance
    const scraper = createMacUpdateScraper(config)

    if (action === 'scrape-listings') {
      // Scrape listing pages - use getNewAppsOnly instead of scrapeListings
      const result = await scraper.getNewAppsOnly(config.category || 'all', 20)
      
      return NextResponse.json({
        success: result.appUrls.length > 0,
        apps: [], // We're not scraping individual apps here, just getting URLs
        totalFound: result.totalApps,
        errors: [],
        warnings: []
      })

    } else if (action === 'scrape-app' && appUrl) {
      // Scrape individual app page - use fallback method directly for Netlify
      console.log('Scraping individual app page:', appUrl)
      
      // Force use of fallback method (axios) instead of Puppeteer
      const app = await scraper.scrapeAppPage(appUrl)
      
      if (app) {
        console.log('Successfully scraped app:', app.name)
        return NextResponse.json({
          success: true,
          app
        })
      } else {
        console.log('Failed to scrape app page')
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

    if (action === 'scrape-listings') {
      // Scrape listing pages - use getNewAppsOnly instead of scrapeListings
      const result = await scraper.getNewAppsOnly(config.category || 'all', 20)
      
      return NextResponse.json({
        success: result.appUrls.length > 0,
        apps: [], // We're not scraping individual apps here, just getting URLs
        totalFound: result.totalApps,
        errors: [],
        warnings: []
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