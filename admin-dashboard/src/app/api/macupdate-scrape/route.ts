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
    const pageLimit = Math.min(parseInt(searchParams.get('pageLimit') || '5'), 10) // Limit to 10 pages max
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const priceFilter = searchParams.get('priceFilter') || 'all' // 'free', 'paid', 'all'
    const category = searchParams.get('category') || 'all'

    console.log(`Scraping MacUpdate: pages=${pageLimit}, minRating=${minRating}, price=${priceFilter}, category=${category}`)

    const allApps: MacUpdateApp[] = []
    const seenAppNames = new Set<string>()

    // Scrape multiple pages with faster approach
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

        console.log('Scraping URL:', url)

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
        console.log(`Received HTML length: ${html.length} characters`)
        
        // Extract apps from the page
        const pageApps = extractAppsFromHtml(html)
        
        console.log(`Extracted ${pageApps.length} apps from page ${page}`)
        
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

        // Reduced rate limiting - faster for Netlify
        if (page < pageLimit) {
          await new Promise(resolve => setTimeout(resolve, 200)) // 200ms instead of 1000ms
        }

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
  
  // Try multiple patterns to find app entries
  const patterns = [
    // Pattern 1: Look for app names in h3 tags
    /<h3[^>]*>([^<]+)<\/h3>/gi,
    // Pattern 2: Look for app names in strong tags
    /<strong[^>]*>([^<]+)<\/strong>/gi,
    // Pattern 3: Look for app names in links
    /<a[^>]*href="[^"]*\/app\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
    // Pattern 4: Look for app names in divs with specific classes
    /<div[^>]*class="[^"]*app[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      try {
        const appName = match[1].trim()
        
        // Skip if it's not a valid app name
        if (!appName || appName.length < 2 || appName.includes('MacUpdate') || appName.includes('©')) {
          continue
        }

        // Try to extract additional data around this app name
        const appData = extractAppDataAroundName(html, appName)
        if (appData) {
          apps.push(appData)
        }
      } catch (error) {
        console.error('Error parsing app from pattern:', error)
        continue
      }
    }
  }

  // Remove duplicates based on name
  const uniqueApps = apps.filter((app, index, self) => 
    index === self.findIndex(a => a.name.toLowerCase() === app.name.toLowerCase())
  )

  console.log(`Found ${apps.length} total apps, ${uniqueApps.length} unique apps`)
  return uniqueApps
}

function extractAppDataAroundName(html: string, appName: string): MacUpdateApp | null {
  try {
    // Find the context around the app name
    const nameIndex = html.indexOf(appName)
    if (nameIndex === -1) return null

    // Get a chunk of HTML around the app name
    const start = Math.max(0, nameIndex - 500)
    const end = Math.min(html.length, nameIndex + 1000)
    const context = html.substring(start, end)

    // Extract rating from context
    let rating = 0
    const ratingMatch = context.match(/(\d+\.?\d*)\s*\/\s*5/i)
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1])
    }

    // Extract review count
    let reviewCount = 0
    const reviewMatch = context.match(/(\d+)\s*reviews?/i)
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1])
    }

    // Extract price
    let price = 'Unknown'
    const priceMatch = context.match(/(Free|\$\d+\.?\d*)/i)
    if (priceMatch) {
      price = priceMatch[1]
    }

    // Extract version
    let version = ''
    const versionMatch = context.match(/Version\s*([\d\.]+)/i)
    if (versionMatch) {
      version = versionMatch[1]
    }

    // Extract description
    let description = ''
    const descMatch = context.match(/<p[^>]*>([^<]+)<\/p>/i)
    if (descMatch) {
      description = descMatch[1].trim()
    }

    // Extract MacUpdate URL
    let macUpdateUrl = ''
    const urlMatch = context.match(/href="([^"]*\/app\/[^"]*)"/i)
    if (urlMatch) {
      macUpdateUrl = `https://www.macupdate.com${urlMatch[1]}`
    }

    return {
      name: appName,
      rating,
      reviewCount,
      price,
      category: 'Unknown',
      description,
      version,
      macUpdateUrl
    }

  } catch (error) {
    console.error('Error extracting app data:', error)
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