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
  iconUrl: string
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

    // Fetch the app page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch app page: ${response.status} ${response.statusText}`)
        return NextResponse.json({ 
          success: false, 
          error: `Failed to fetch app page: ${response.status} ${response.statusText}` 
        }, { status: 500 })
      }

      const html = await response.text()
      console.log(`Fetched app page, HTML length: ${html.length} characters`)

      if (!html || html.length < 1000) {
        console.error('Received empty or very short HTML response')
        return NextResponse.json({ 
          success: false, 
          error: 'Received invalid or empty page content' 
        }, { status: 500 })
      }

      // Parse the app data from the page
      const app = parseAppPage(html, url)

      if (!app) {
        console.error('Failed to parse app data from HTML')
        return NextResponse.json({ 
          success: false, 
          error: 'Could not parse app data from the page. The page structure may have changed.' 
        }, { status: 500 })
      }

      console.log(`Successfully parsed app: ${app.name}`)

      return NextResponse.json({
        success: true,
        app: app
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Request timeout')
        return NextResponse.json({ 
          success: false, 
          error: 'Request timeout - the page took too long to load' 
        }, { status: 500 })
      }
      
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}

function parseAppPage(html: string, url: string): MacUpdateApp | null {
  try {
    console.log('Starting to parse app page...')

    // Initialize with defaults
    let name = 'Unknown App'
    let developer = 'Unknown Developer' 
    let description = 'No description available'
    let category = 'Utilities'
    let price = 'Unknown'
    let rating = 0
    let reviewCount = 0
    let version = 'Unknown'
    let lastUpdated = 'Unknown'
    let fileSize = 'Unknown'
    let requirements = 'macOS'
    let website = ''
    let screenshots: string[] = []
    let iconUrl = ''

    // Try to extract app name with multiple fallbacks
    try {
      const nameMatch = html.match(/<h1[^>]*>([^<]+)(?:<\s*span[^>]*>.*?<\/span>)?<\/h1>/) ||
                       html.match(/<h1[^>]*class="[^"]*app_title[^"]*"[^>]*>([^<]+)<\/h1>/) ||
                       html.match(/<h1[^>]*class="[^"]*mu_title[^"]*"[^>]*>([^<]+)<\/h1>/) ||
                       html.match(/<title>([^<]+?)\s*\|\s*MacUpdate<\/title>/) ||
                       html.match(/<title>([^<]+?)\s*-\s*MacUpdate<\/title>/) ||
                       html.match(/<title>([^<]+)<\/title>/)
      
      if (nameMatch) {
        name = nameMatch[1].trim()
        // Clean up the name - remove common suffixes
        name = name.replace(/\s+(for\s+Mac|for\s+macOS|\(Mac\)|\(macOS\))$/i, '').trim()
        
        // If name is empty after cleanup, try alternative extraction
        if (!name) {
          const altNameMatch = html.match(/<div[^>]*class="[^"]*main_data[^"]*"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)/i)
          if (altNameMatch) {
            name = altNameMatch[1].trim().replace(/\s+(for\s+Mac|for\s+macOS|\(Mac\)|\(macOS\))$/i, '').trim()
          }
        }
      }
      console.log(`Extracted app name: ${name}`)
    } catch (nameError) {
      console.error('Error extracting name:', nameError)
    }

    // Try to extract developer
    try {
      const developerMatch = html.match(/by\s+<a[^>]*>([^<]+)<\/a>/) ||
                            html.match(/Developer[^>]*>([^<]+)</) ||
                            html.match(/by\s+([^<\n]+)/) ||
                            html.match(/<span[^>]*class="[^"]*developer[^"]*"[^>]*>([^<]+)<\/span>/)
      if (developerMatch) {
        developer = developerMatch[1].trim()
      }
      console.log(`Extracted developer: ${developer}`)
    } catch (devError) {
      console.error('Error extracting developer:', devError)
    }

    // Try to extract description
    try {
      const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
                       html.match(/<div[^>]*class="[^"]*mu_description[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
                       html.match(/<meta\s+name="description"\s+content="([^"]+)"/) ||
                       html.match(/<p[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/p>/) ||
                       html.match(/<div[^>]*class="[^"]*app_summary[^"]*"[^>]*>([\s\S]*?)<\/div>/)
      
      if (descMatch) {
        description = descMatch[1]
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        if (description.length > 500) {
          description = description.substring(0, 500) + '...'
        }
      }
      console.log(`Extracted description length: ${description.length}`)
    } catch (descError) {
      console.error('Error extracting description:', descError)
    }

    // Extract other basic fields with error handling
    try {
      const categoryMatch = html.match(/Category[^>]*>([^<]+)</) ||
                           html.match(/category\/([^"\/]+)/) ||
                           html.match(/Categories?[^>]*>.*?>([^<]+)</)
      if (categoryMatch) {
        category = categoryMatch[1].trim().replace(/-/g, ' ')
      }

      const priceMatch = html.match(/Price[^>]*>([^<]+)</) ||
                        html.match(/\$[\d.,]+/) ||
                        html.match(/Free/)
      if (priceMatch) {
        price = priceMatch[1].trim()
      }

      const ratingMatch = html.match(/rating[^>]*>[\s\S]*?([\d.]+)/) ||
                         html.match(/([\d.]+)\s*\/\s*5/) ||
                         html.match(/stars?[^>]*>[\s\S]*?([\d.]+)/)
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1])
      }

      const reviewMatch = html.match(/(\d+)\s*reviews?/) ||
                         html.match(/(\d+)\s*ratings?/) ||
                         html.match(/reviews?[^>]*>[\s\S]*?(\d+)/)
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1])
      }

      const versionMatch = html.match(/Version[^>]*>([^<]+)</) ||
                          html.match(/v([\d.]+)/) ||
                          html.match(/(\d+\.[\d.]+)/)
      if (versionMatch) {
        version = versionMatch[1].trim()
      }

      console.log(`Extracted basic info: category=${category}, price=${price}, rating=${rating}`)
    } catch (basicError) {
      console.error('Error extracting basic info:', basicError)
    }

    // Extract screenshots with error handling
    try {
      // Try gallery method first
      const galleryMatch = html.match(/<div class="mu_app_gallery[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="mu_app_gallery_video">)/i)
      if (galleryMatch) {
        console.log('Found mu_app_gallery, extracting screenshots...')
        
        // Extract from picture elements with srcset
        const pictureMatches = galleryMatch[1].match(/<picture[^>]*>[\s\S]*?<source[^>]*srcset="([^"]+)"[^>]*>[\s\S]*?<\/picture>/gi)
        if (pictureMatches) {
          pictureMatches.forEach(pictureMatch => {
            const srcsetMatch = pictureMatch.match(/srcset="([^"]+)"/)
            if (srcsetMatch && srcsetMatch[1]) {
              let screenshotUrl = srcsetMatch[1].split(',')[0].trim() // Take first URL from srcset
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
        
        // Also try to extract from img tags within the gallery as fallback
        const imgMatches = galleryMatch[1].match(/<img[^>]*src="([^"]+)"[^>]*>/gi)
        if (imgMatches) {
          imgMatches.forEach(imgMatch => {
            const srcMatch = imgMatch.match(/src="([^"]+)"/)
            if (srcMatch && srcMatch[1]) {
              let screenshotUrl = srcMatch[1]
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
      }
      
      // Fallback: general screenshot search if gallery method didn't work
      if (screenshots.length === 0) {
        console.log('Gallery method failed, trying fallback screenshot extraction...')
        const screenshotMatches = html.match(/src="([^"]+(?:screenshot|screen|shot)[^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi)
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
      }
      console.log(`Extracted ${screenshots.length} screenshots`)
    } catch (screenshotError) {
      console.error('Error extracting screenshots:', screenshotError)
    }

    // Extract icon with error handling
    try {
      const iconUrlMatch = html.match(/<img[^>]*class="[^"]*main_logo[^"]*"[^>]*src="([^"]+)"[^>]*>/) ||
                           html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*main_logo[^"]*"[^>]*>/)
      if (iconUrlMatch) {
        iconUrl = iconUrlMatch[1]
        if (iconUrl.startsWith('//')) {
          iconUrl = 'https:' + iconUrl
        } else if (iconUrl.startsWith('/')) {
          iconUrl = 'https://www.macupdate.com' + iconUrl
        }
      }
      console.log(`Extracted icon URL: ${iconUrl}`)
    } catch (iconError) {
      console.error('Error extracting icon:', iconError)
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
      screenshots,
      iconUrl
    }

    console.log(`Successfully created app object:`, {
      name: app.name,
      developer: app.developer,
      category: app.category,
      price: app.price,
      rating: app.rating,
      screenshots: app.screenshots.length,
      iconUrl: !!app.iconUrl
    })

    // Return the app object even if some fields are missing
    return app

  } catch (error) {
    console.error('Error parsing app page:', error)
    return null
  }
} 