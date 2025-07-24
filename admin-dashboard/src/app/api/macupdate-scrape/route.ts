import { NextRequest, NextResponse } from 'next/server'

interface MacUpdateApp {
  name: string
  rating: number
  reviewCount: number
  price: string
  category: string
  description: string
  version: string
  macUpdateUrl: string
  lastUpdated?: string
  developer?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageLimit = parseInt(searchParams.get('pageLimit') || '20')
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const priceFilter = searchParams.get('priceFilter') || 'all' // 'free', 'paid', 'all'
    const category = searchParams.get('category') || 'all'

    console.log(`Scraping MacUpdate: pages=${pageLimit}, minRating=${minRating}, price=${priceFilter}, category=${category}`)

    const allApps: MacUpdateApp[] = []
    const seenAppNames = new Set<string>()

    // Scrape multiple pages
    for (let page = 1; page <= pageLimit; page++) {
      try {
        console.log(`Scraping MacUpdate page ${page}/${pageLimit}`)
        
        // Build URL with filters
        let url = `https://www.macupdate.com/find/mac?page=${page}&sort=computed_rank`
        
        if (priceFilter === 'free') {
          url += '&price=free'
        } else if (priceFilter === 'paid') {
          url += '&price=paid'
        }
        
        if (category !== 'all') {
          url += `&category=${encodeURIComponent(category)}`
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })

        if (!response.ok) {
          console.error(`Failed to fetch page ${page}: ${response.status}`)
          continue
        }

        const html = await response.text()
        
        // Extract apps from the page
        const pageApps = extractAppsFromHtml(html)
        
        // Filter and deduplicate
        for (const app of pageApps) {
          if (!seenAppNames.has(app.name.toLowerCase())) {
            seenAppNames.add(app.name.toLowerCase())
            
            // Apply rating filter with flexible logic
            if (shouldIncludeApp(app, minRating)) {
              allApps.push(app)
            }
          }
        }

        console.log(`Page ${page}: Found ${pageApps.length} apps, ${allApps.length} total unique apps`)

        // Rate limiting - be respectful
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error scraping page ${page}:`, error)
        continue
      }
    }

    console.log(`MacUpdate scraping complete: ${allApps.length} apps found`)

    return NextResponse.json({
      success: true,
      apps: allApps,
      totalPages: pageLimit,
      totalApps: allApps.length
    })

  } catch (error) {
    console.error('Error in MacUpdate scraping:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape MacUpdate' },
      { status: 500 }
    )
  }
}

function extractAppsFromHtml(html: string): MacUpdateApp[] {
  const apps: MacUpdateApp[] = []
  
  // Look for app entries in the HTML
  // MacUpdate app entries typically have a specific structure
  const appPattern = /<div[^>]*class="[^"]*app[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  let match

  while ((match = appPattern.exec(html)) !== null) {
    const appHtml = match[1]
    
    try {
      const app = parseAppFromHtml(appHtml)
      if (app) {
        apps.push(app)
      }
    } catch (error) {
      console.error('Error parsing app HTML:', error)
      continue
    }
  }

  return apps
}

function parseAppFromHtml(appHtml: string): MacUpdateApp | null {
  try {
    // Extract app name
    const nameMatch = appHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i)
    const name = nameMatch ? nameMatch[1].trim() : ''

    if (!name) return null

    // Extract rating
    const ratingMatch = appHtml.match(/(\d+\.?\d*)\s*\/\s*5/i)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

    // Extract review count
    const reviewMatch = appHtml.match(/(\d+)\s*reviews?/i)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0

    // Extract price
    const priceMatch = appHtml.match(/(Free|\$\d+\.?\d*)/i)
    const price = priceMatch ? priceMatch[1] : 'Unknown'

    // Extract version
    const versionMatch = appHtml.match(/Version\s*([\d\.]+)/i)
    const version = versionMatch ? versionMatch[1] : ''

    // Extract description
    const descMatch = appHtml.match(/<p[^>]*>([^<]+)<\/p>/i)
    const description = descMatch ? descMatch[1].trim() : ''

    // Extract MacUpdate URL
    const urlMatch = appHtml.match(/href="([^"]*\/app\/[^"]*)"/i)
    const macUpdateUrl = urlMatch ? `https://www.macupdate.com${urlMatch[1]}` : ''

    // Extract category (this might be in a different part of the page)
    const category = 'Unknown' // We'll need to extract this from the page structure

    return {
      name,
      rating,
      reviewCount,
      price,
      category,
      description,
      version,
      macUpdateUrl
    }

  } catch (error) {
    console.error('Error parsing app HTML:', error)
    return null
  }
}

function shouldIncludeApp(app: MacUpdateApp, minRating: number): boolean {
  // Flexible rating strategy for new apps
  if (app.rating >= minRating) {
    return true // Established app with good rating
  }
  
  // New app with 0 rating - check quality indicators
  if (app.rating === 0) {
    const hasGoodDescription = app.description.length > 20
    const hasVersion = app.version.length > 0
    const hasUrl = app.macUpdateUrl.length > 0
    
    // Include if it has quality indicators
    return hasGoodDescription && hasVersion && hasUrl
  }
  
  return false
} 