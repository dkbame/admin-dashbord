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
  
  // Look for app cards in the search results - updated pattern based on actual HTML
  // Try multiple patterns to find apps
  
  // Pattern 1: Look for links to app pages
  const appLinkPattern = /<a[^>]*href="([^"]*\.macupdate\.com[^"]*)"[^>]*>([^<]+)<\/a>/gi
  const appUrlPattern = /<a[^>]*href="https:\/\/([^"]*\.macupdate\.com[^"]*)"[^>]*>/gi
  
  // First, find all app URLs
  const foundUrls = new Set<string>()
  let match
  
  while ((match = appUrlPattern.exec(html)) !== null) {
    const appUrl = `https://${match[1]}`
    if (appUrl.includes('.macupdate.com') && !appUrl.includes('/explore/') && !appUrl.includes('/find/')) {
      foundUrls.add(appUrl)
    }
  }
  
  console.log(`Found ${foundUrls.size} potential app URLs`)
  
  // For each found URL, try to extract app data from the surrounding HTML
  for (const appUrl of foundUrls) {
    try {
      const app = extractAppDataFromUrl(html, appUrl)
      if (app) {
        apps.push(app)
        console.log(`Found app: ${app.name} (${app.rating}/5, ${app.price})`)
      }
    } catch (error) {
      console.error('Error parsing app from URL:', appUrl, error)
      continue
    }
  }

  console.log(`Found ${foundUrls.size} app URLs, parsed ${apps.length} valid apps`)

  // Remove duplicates based on name
  const uniqueApps = apps.filter((app, index, self) => 
    index === self.findIndex(a => a.name.toLowerCase() === app.name.toLowerCase())
  )

  console.log(`Found ${apps.length} total apps, ${uniqueApps.length} unique apps`)
  return uniqueApps
}

function extractAppDataFromUrl(html: string, appUrl: string): MacUpdateApp | null {
  try {
    // Find the context around this app URL
    const urlIndex = html.indexOf(appUrl)
    if (urlIndex === -1) return null

    // Get a larger chunk of HTML around the app URL to find the app data
    const start = Math.max(0, urlIndex - 1000)
    const end = Math.min(html.length, urlIndex + 1000)
    const context = html.substring(start, end)

    // Extract app name from the URL or context
    let name = ''
    
    // Try to get name from the URL
    const urlMatch = appUrl.match(/https:\/\/([^.]+)\.macupdate\.com/)
    if (urlMatch) {
      name = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    // Try to find a better name in the context
    const namePatterns = [
      /<a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /<h3[^>]*>([^<]+)<\/h3>/gi,
      /<strong[^>]*>([^<]+)<\/strong>/gi
    ]
    
    for (const pattern of namePatterns) {
      let nameMatch
      pattern.lastIndex = 0 // Reset regex
      while ((nameMatch = pattern.exec(context)) !== null) {
        const potentialName = nameMatch[1].trim()
        if (potentialName.length > 2 && isValidAppName(potentialName) && potentialName.length > name.length) {
          name = potentialName
        }
      }
    }

    if (!name || !isValidAppName(name)) return null

    // Extract rating from context
    let rating = 0
    const ratingPatterns = [
      /(\d+\.?\d*)\s*\/\s*5/i,
      /"rating[^"]*"[^>]*>([^<]+)</gi,
      /rating[^>]*>(\d+\.?\d*)/gi
    ]
    
    for (const pattern of ratingPatterns) {
      const ratingMatch = context.match(pattern)
      if (ratingMatch) {
        const ratingValue = parseFloat(ratingMatch[1])
        if (ratingValue >= 0 && ratingValue <= 5) {
          rating = ratingValue
          break
        }
      }
    }

    // Extract review count from context
    let reviewCount = 0
    const reviewPatterns = [
      /(\d+)\s*reviews?/i,
      /(\d+)\s*ratings?/i,
      /based\s+on\s+(\d+)/i
    ]
    
    for (const pattern of reviewPatterns) {
      const reviewMatch = context.match(pattern)
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1])
        break
      }
    }

    // Extract price from context
    let price = 'Unknown'
    const pricePatterns = [
      /(Free)/i,
      /(\$\d+\.?\d*)/i,
      /price[^>]*>([^<]+)</gi
    ]
    
    for (const pattern of pricePatterns) {
      const priceMatch = context.match(pattern)
      if (priceMatch) {
        price = priceMatch[1]
        break
      }
    }

    // Extract version from context
    let version = ''
    const versionPatterns = [
      /Version\s*([\d\.]+)/i,
      /version[^>]*>([^<]+)</gi,
      /v(\d+\.[\d\.]+)/i
    ]
    
    for (const pattern of versionPatterns) {
      const versionMatch = context.match(pattern)
      if (versionMatch) {
        version = versionMatch[1]
        break
      }
    }

    // Extract description from context
    let description = ''
    const descPatterns = [
      /<p[^>]*>([^<]+)<\/p>/i,
      /description[^>]*>([^<]+)</gi
    ]
    
    for (const pattern of descPatterns) {
      const descMatch = context.match(pattern)
      if (descMatch && descMatch[1].length > 10) {
        description = descMatch[1].trim()
        break
      }
    }

    return {
      name,
      rating,
      reviewCount,
      price,
      category: 'Unknown',
      description,
      version,
      macUpdateUrl: appUrl
    }

  } catch (error) {
    console.error('Error extracting app data from URL:', error)
    return null
  }
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