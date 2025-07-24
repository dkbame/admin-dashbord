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
        
        // Debug: Look for app-related HTML structure
        const appDivs = (html.match(/<div[^>]*class="[^"]*app[^"]*"[^>]*>/gi) || []).length
        const appLinks = (html.match(/href="\/app\/[^"]*"/gi) || []).length
        const h3Tags = (html.match(/<h3[^>]*>/gi) || []).length
        
        console.log(`HTML structure: ${appDivs} app divs, ${appLinks} app links, ${h3Tags} h3 tags`)
        
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
  
  // Look specifically for app listing containers
  // MacUpdate app listings are typically in specific div structures
  const appContainerPattern = /<div[^>]*class="[^"]*app[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  const appLinkPattern = /<a[^>]*href="\/app\/[^"]*"[^>]*>([^<]+)<\/a>/gi
  
  // First try to find app containers
  let match
  while ((match = appContainerPattern.exec(html)) !== null) {
    try {
      const appHtml = match[1]
      const app = parseAppFromContainer(appHtml)
      if (app) {
        apps.push(app)
      }
    } catch (error) {
      console.error('Error parsing app container:', error)
      continue
    }
  }
  
  // If no apps found in containers, try direct app links
  if (apps.length === 0) {
    while ((match = appLinkPattern.exec(html)) !== null) {
      try {
        const appName = match[1].trim()
        
        // Validate this looks like a real app name
        if (isValidAppName(appName)) {
          const appData = extractAppDataFromLink(html, match[0])
          if (appData) {
            apps.push(appData)
          }
        }
      } catch (error) {
        console.error('Error parsing app link:', error)
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

function isValidAppName(name: string): boolean {
  // Must be at least 2 characters
  if (name.length < 2) return false
  
  // Must not contain HTML tags
  if (name.includes('<') || name.includes('>')) return false
  
  // Must not be common page elements
  const invalidNames = [
    'overview', 'details', 'download', 'search', 'filter', 'form', 'button',
    'input', 'label', 'div', 'span', 'ul', 'li', 'script', 'style',
    'macupdate', 'copyright', '©', 'privacy', 'terms', 'contact',
    'login', 'signup', 'register', 'help', 'about', 'support'
  ]
  
  const lowerName = name.toLowerCase()
  return !invalidNames.some(invalid => lowerName.includes(invalid))
}

function parseAppFromContainer(appHtml: string): MacUpdateApp | null {
  try {
    // Extract app name from h3 or strong tag within the container
    const nameMatch = appHtml.match(/<(h3|strong)[^>]*>([^<]+)<\/\1>/i)
    if (!nameMatch) return null
    
    const name = nameMatch[2].trim()
    if (!isValidAppName(name)) return null

    // Extract rating
    let rating = 0
    const ratingMatch = appHtml.match(/(\d+\.?\d*)\s*\/\s*5/i)
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1])
    }

    // Extract review count
    let reviewCount = 0
    const reviewMatch = appHtml.match(/(\d+)\s*reviews?/i)
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1])
    }

    // Extract price
    let price = 'Unknown'
    const priceMatch = appHtml.match(/(Free|\$\d+\.?\d*)/i)
    if (priceMatch) {
      price = priceMatch[1]
    }

    // Extract version
    let version = ''
    const versionMatch = appHtml.match(/Version\s*([\d\.]+)/i)
    if (versionMatch) {
      version = versionMatch[1]
    }

    // Extract description
    let description = ''
    const descMatch = appHtml.match(/<p[^>]*>([^<]+)<\/p>/i)
    if (descMatch) {
      description = descMatch[1].trim()
    }

    // Extract MacUpdate URL
    let macUpdateUrl = ''
    const urlMatch = appHtml.match(/href="([^"]*\/app\/[^"]*)"/i)
    if (urlMatch) {
      macUpdateUrl = `https://www.macupdate.com${urlMatch[1]}`
    }

    return {
      name,
      rating,
      reviewCount,
      price,
      category: 'Unknown',
      description,
      version,
      macUpdateUrl
    }

  } catch (error) {
    console.error('Error parsing app from container:', error)
    return null
  }
}

function extractAppDataFromLink(html: string, linkHtml: string): MacUpdateApp | null {
  try {
    // Extract app name from the link
    const nameMatch = linkHtml.match(/>([^<]+)</)
    if (!nameMatch) return null
    
    const name = nameMatch[1].trim()
    if (!isValidAppName(name)) return null

    // Extract URL from the link
    const urlMatch = linkHtml.match(/href="([^"]*\/app\/[^"]*)"/)
    const macUpdateUrl = urlMatch ? `https://www.macupdate.com${urlMatch[1]}` : ''

    // Find context around this link for additional data
    const linkIndex = html.indexOf(linkHtml)
    if (linkIndex === -1) return null

    const start = Math.max(0, linkIndex - 300)
    const end = Math.min(html.length, linkIndex + 500)
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

    return {
      name,
      rating,
      reviewCount,
      price,
      category: 'Unknown',
      description: '',
      version: '',
      macUpdateUrl
    }

  } catch (error) {
    console.error('Error extracting app data from link:', error)
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