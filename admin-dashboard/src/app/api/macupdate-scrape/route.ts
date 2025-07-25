import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
    const pageLimit = Math.min(parseInt(searchParams.get('pageLimit') || '2'), 3) // Reduced to 3 pages max
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const priceFilter = searchParams.get('priceFilter') || 'all'
    const category = searchParams.get('category') || 'all'

    console.log(`Scraping MacUpdate: pages=${pageLimit}, minRating=${minRating}, price=${priceFilter}, category=${category}`)

    const allApps: MacUpdateApp[] = []
    const seenAppNames = new Set<string>()

    // Scrape with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scraping timeout')), 8000) // 8 second timeout
    })

    const scrapingPromise = scrapeMacUpdatePages(pageLimit, minRating, priceFilter, category, allApps, seenAppNames)

    try {
      await Promise.race([scrapingPromise, timeoutPromise])
    } catch (error) {
      console.error('Scraping timeout or error:', error)
      // Return whatever we have so far
      return NextResponse.json({
        success: true,
        apps: allApps,
        totalPages: pageLimit,
        totalApps: allApps.length,
        warning: 'Scraping was limited due to timeout'
      })
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

async function scrapeMacUpdatePages(
  pageLimit: number, 
  minRating: number, 
  priceFilter: string, 
  category: string,
  allApps: MacUpdateApp[],
  seenAppNames: Set<string>
) {
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

      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per page

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
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

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
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms instead of 200ms
      }

    } catch (error) {
      console.error(`Error scraping page ${page}:`, error)
      continue
    }
  }
}

function extractAppsFromHtml(html: string): MacUpdateApp[] {
  const apps: MacUpdateApp[] = []
  
  try {
    // Look for the __NEXT_DATA__ script tag that contains the JSON data
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    
    if (!nextDataMatch) {
      console.log('No __NEXT_DATA__ script found')
      return apps
    }

    // Parse the JSON data
    const jsonData = JSON.parse(nextDataMatch[1])
    console.log('Found __NEXT_DATA__ script')
    
    // Navigate to the search results data
    const searchResult = jsonData?.props?.pageProps?.searchResult
    if (!searchResult || !searchResult.success) {
      console.log('No valid search result data found')
      return apps
    }

    const appsData = searchResult.data
    if (!Array.isArray(appsData)) {
      console.log('Apps data is not an array')
      return apps
    }

    console.log(`Found ${appsData.length} apps in JSON data`)

    // Convert each app from the JSON structure to our MacUpdateApp format
    for (const appData of appsData) {
      try {
        const app: MacUpdateApp = {
          name: appData.title || 'Unknown',
          rating: appData.rating || 0,
          reviewCount: appData.review_count || 0,
          price: formatPrice(appData.price),
          category: 'Unknown', // Category not directly available in this data
          description: appData.short_description || '',
          version: appData.version || '',
          macUpdateUrl: appData.custom_url || `https://${appData.title_slug}.macupdate.com`,
          lastUpdated: appData.date?.date || '',
          developer: 'Unknown' // Developer not directly available in this data
        }

        // Only include apps with valid names
        if (isValidAppName(app.name)) {
          apps.push(app)
          console.log(`Found app: ${app.name} (${app.rating}/5, ${app.price})`)
        }
      } catch (error) {
        console.error('Error parsing app data:', error)
        continue
      }
    }

  } catch (error) {
    console.error('Error parsing JSON data:', error)
    return apps
  }

  console.log(`Successfully parsed ${apps.length} apps from JSON data`)
  return apps
}

function formatPrice(priceData: any): string {
  if (!priceData || typeof priceData !== 'object') {
    return 'Unknown'
  }
  
  if (priceData.value === 0) {
    return 'Free'
  }
  
  // Convert cents to dollars
  const dollars = (priceData.value / 100).toFixed(2)
  const currency = priceData.currency || 'USD'
  
  if (currency === 'USD') {
    return `$${dollars}`
  } else {
    return `${dollars} ${currency}`
  }
}

function isValidAppName(name: string): boolean {
  // Must be at least 2 characters
  if (name.length < 2) return false
  
  // Must not contain HTML tags
  if (name.includes('<') || name.includes('>')) return false
  
  // Must not be common page elements, navigation, or categories
  const invalidNames = [
    'overview', 'details', 'download', 'search', 'filter', 'form', 'button',
    'input', 'label', 'div', 'span', 'ul', 'li', 'script', 'style',
    'macupdate', 'copyright', '©', 'privacy', 'terms', 'contact',
    'login', 'signup', 'register', 'help', 'about', 'support',
    'www', 'articles', 'discontinued apps', 'app requirements:',
    'video converters', 'video recording', 'video players', 'video editors',
    'audio converters', 'audio players', 'audio recording', 'audio production',
    'photo editors', 'photo viewers', 'image converters', 'image capture',
    'games', 'music', 'productivity', 'system utilities', 'security',
    'internet utilities', 'graphic design', 'developer tools',
    'browse', 'categories', 'all apps', 'featured', 'popular', 'new',
    'free', 'paid', 'rating', 'reviews', 'version', 'updated',
    'requirements', 'specifications', 'features', 'screenshots'
  ]
  
  const lowerName = name.toLowerCase().trim()
  
  // Reject if it matches any invalid name exactly or contains invalid terms
  if (invalidNames.some(invalid => lowerName === invalid || lowerName.includes(invalid))) {
    return false
  }
  
  // Reject very short names (likely abbreviations or codes)
  if (lowerName.length < 3) return false
  
  // Reject names that are mostly numbers or symbols
  if (/^[\d\s\-_.]+$/.test(lowerName)) return false
  
  // Reject names ending with colons (likely headings)
  if (lowerName.endsWith(':')) return false
  
  return true
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