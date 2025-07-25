import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface MacUpdateApp {
  name: string
  developer: string
  description: string
  category: string
  price: string
  rating: number
  reviewCount: number
  version: string
  macUpdateUrl: string
  lastUpdated: string
  fileSize: string
  requirements: string
  website: string
  screenshots: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || !url.includes('macupdate.com')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please provide a valid MacUpdate URL' 
      }, { status: 400 })
    }

    console.log(`Scraping MacUpdate app: ${url}`)

    // Fetch the app page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch app page: ${response.status}` 
      }, { status: 500 })
    }

    const html = await response.text()
    console.log('Fetched app page, parsing...')

    // Parse the app data from the page
    const app = parseAppPage(html, url)

    if (!app) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not parse app data from the page' 
      }, { status: 500 })
    }

    console.log(`Successfully parsed app: ${app.name}`)

    return NextResponse.json({
      success: true,
      app: app
    })

  } catch (error) {
    console.error('Error scraping MacUpdate app:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function parseAppPage(html: string, url: string): MacUpdateApp | null {
  try {
    // Extract app name
    const nameMatch = html.match(/<h1[^>]*class="[^"]*app_title[^"]*"[^>]*>([^<]+)<\/h1>/) ||
                     html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
                     html.match(/<title>([^<]+?)\s*\|\s*MacUpdate<\/title>/)
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown App'

    // Extract developer
    const developerMatch = html.match(/by\s+<a[^>]*>([^<]+)<\/a>/) ||
                          html.match(/Developer[^>]*>([^<]+)</) ||
                          html.match(/by\s+([^<\n]+)/)
    const developer = developerMatch ? developerMatch[1].trim() : 'Unknown Developer'

    // Extract description
    const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
                     html.match(/<meta\s+name="description"\s+content="([^"]+)"/) ||
                     html.match(/<p[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/p>/)
    let description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description available'
    if (description.length > 500) {
      description = description.substring(0, 500) + '...'
    }

    // Extract category
    const categoryMatch = html.match(/Category[^>]*>([^<]+)</) ||
                         html.match(/category\/([^"\/]+)/) ||
                         html.match(/Categories?[^>]*>.*?>([^<]+)</)
    const category = categoryMatch ? categoryMatch[1].trim().replace(/-/g, ' ') : 'Utilities'

    // Extract price
    const priceMatch = html.match(/Price[^>]*>([^<]+)</) ||
                      html.match(/\$[\d.,]+/) ||
                      html.match(/Free/)
    const price = priceMatch ? priceMatch[1].trim() : 'Unknown'

    // Extract rating
    const ratingMatch = html.match(/rating[^>]*>[\s\S]*?([\d.]+)/) ||
                       html.match(/([\d.]+)\s*\/\s*5/) ||
                       html.match(/stars?[^>]*>[\s\S]*?([\d.]+)/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

    // Extract review count
    const reviewMatch = html.match(/(\d+)\s*reviews?/) ||
                       html.match(/(\d+)\s*ratings?/) ||
                       html.match(/reviews?[^>]*>[\s\S]*?(\d+)/)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0

    // Extract version
    const versionMatch = html.match(/Version[^>]*>([^<]+)</) ||
                        html.match(/v([\d.]+)/) ||
                        html.match(/(\d+\.[\d.]+)/)
    const version = versionMatch ? versionMatch[1].trim() : 'Unknown'

    // Extract last updated
    const updatedMatch = html.match(/Updated[^>]*>([^<]+)</) ||
                        html.match(/Last\s+updated[^>]*>([^<]+)</) ||
                        html.match(/(\d{4}-\d{2}-\d{2})/)
    const lastUpdated = updatedMatch ? updatedMatch[1].trim() : 'Unknown'

    // Extract file size
    const sizeMatch = html.match(/Size[^>]*>([^<]+)</) ||
                     html.match(/([\d.]+\s*[KMGT]B)/) ||
                     html.match(/(\d+\.?\d*\s*MB)/)
    const fileSize = sizeMatch ? sizeMatch[1].trim() : 'Unknown'

    // Extract requirements
    const reqMatch = html.match(/Requirements?[^>]*>([^<]+)</) ||
                    html.match(/macOS\s+([\d.]+)/) ||
                    html.match(/OS\s+X\s+([\d.]+)/)
    const requirements = reqMatch ? reqMatch[1].trim() : 'macOS'

    // Extract website
    const websiteMatch = html.match(/Website[^>]*href="([^"]+)"/) ||
                        html.match(/homepage[^>]*href="([^"]+)"/) ||
                        html.match(/official[^>]*href="([^"]+)"/)
    const website = websiteMatch ? websiteMatch[1] : ''

    // Extract screenshots
    const screenshots: string[] = []
    const screenshotMatches = html.match(/src="([^"]+(?:screenshot|screen|shot)[^"]*\.(?:jpg|jpeg|png|gif))"/gi)
    if (screenshotMatches) {
      screenshotMatches.forEach(match => {
        const urlMatch = match.match(/src="([^"]+)"/)
        if (urlMatch && urlMatch[1]) {
          let screenshotUrl = urlMatch[1]
          if (screenshotUrl.startsWith('//')) {
            screenshotUrl = 'https:' + screenshotUrl
          } else if (screenshotUrl.startsWith('/')) {
            screenshotUrl = 'https://www.macupdate.com' + screenshotUrl
          }
          if (!screenshots.includes(screenshotUrl)) {
            screenshots.push(screenshotUrl)
          }
        }
      })
    }

    const app: MacUpdateApp = {
      name,
      developer,
      description,
      category,
      price,
      rating,
      reviewCount,
      version,
      macUpdateUrl: url,
      lastUpdated,
      fileSize,
      requirements,
      website,
      screenshots
    }

    console.log(`Parsed app data:`, {
      name: app.name,
      developer: app.developer,
      category: app.category,
      price: app.price,
      rating: app.rating,
      screenshots: app.screenshots.length
    })

    return app

  } catch (error) {
    console.error('Error parsing app page:', error)
    return null
  }
} 