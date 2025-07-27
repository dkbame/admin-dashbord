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

    // Initialize with default values
    let app: MacUpdateApp = {
      name: '',
      developer: '',
      description: '',
      category: '',
      price: '',
      rating: 0,
      reviewCount: 0,
      version: '',
      macUpdateUrl: url,
      lastUpdated: '',
      fileSize: '',
      requirements: '',
      website: '',
      screenshots: [],
      iconUrl: ''
    }

    try {
      // Extract app name
      const nameMatch = html.match(/<h1[^>]*>([^<]*?)(?:<span[^>]*>.*?<\/span>)?[^<]*<\/h1>/)
      if (nameMatch) {
        app.name = nameMatch[1].trim()
          .replace(/\s+(for\s+Mac|for\s+macOS|\(Mac\)|\(macOS\))$/i, '')
          .substring(0, 255) // Limit to 255 chars
      } else {
        // Fallback: try to extract from main_data div
        const altNameMatch = html.match(/<div[^>]*class="[^"]*main_data[^"]*"[^>]*>.*?<h1[^>]*>([^<]*?)(?:<span[^>]*>.*?<\/span>)?[^<]*<\/h1>/i)
        if (altNameMatch) {
          app.name = altNameMatch[1].trim()
            .replace(/\s+(for\s+Mac|for\s+macOS|\(Mac\)|\(macOS\))$/i, '')
            .substring(0, 255)
        }
      }
      console.log('Extracted name:', app.name)
    } catch (error) {
      console.log('Error extracting name:', error)
    }

    try {
      // Extract developer
      const developerMatch = html.match(/<div[^>]*class="[^"]*developer[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/i)
      if (developerMatch) {
        app.developer = developerMatch[1].trim().substring(0, 255)
      }
      console.log('Extracted developer:', app.developer)
    } catch (error) {
      console.log('Error extracting developer:', error)
    }

    try {
      // Extract description
      const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/i)
      if (descMatch) {
        app.description = descMatch[1].trim().substring(0, 1000) // Limit to 1000 chars
      }
      console.log('Extracted description length:', app.description.length)
    } catch (error) {
      console.log('Error extracting description:', error)
    }

    try {
      // Extract category
      const categoryMatch = html.match(/<div[^>]*class="[^"]*category[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/i)
      if (categoryMatch) {
        app.category = categoryMatch[1].trim().substring(0, 100)
      }
      console.log('Extracted category:', app.category)
    } catch (error) {
      console.log('Error extracting category:', error)
    }

    try {
      // Extract price
      const priceMatch = html.match(/<div[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)/i)
      if (priceMatch) {
        app.price = priceMatch[1].trim().substring(0, 50)
      }
      console.log('Extracted price:', app.price)
    } catch (error) {
      console.log('Error extracting price:', error)
    }

    try {
      // Extract rating
      const ratingMatch = html.match(/<div[^>]*class="[^"]*rating[^"]*"[^>]*>([0-9.]+)/i)
      if (ratingMatch) {
        app.rating = parseFloat(ratingMatch[1]) || 0
      }
      console.log('Extracted rating:', app.rating)
    } catch (error) {
      console.log('Error extracting rating:', error)
    }

    try {
      // Extract review count
      const reviewMatch = html.match(/<div[^>]*class="[^"]*reviews[^"]*"[^>]*>([0-9]+)/i)
      if (reviewMatch) {
        app.reviewCount = parseInt(reviewMatch[1]) || 0
      }
      console.log('Extracted review count:', app.reviewCount)
    } catch (error) {
      console.log('Error extracting review count:', error)
    }

    try {
      // Extract version
      const versionMatch = html.match(/<div[^>]*class="[^"]*version[^"]*"[^>]*>([^<]+)/i)
      if (versionMatch) {
        app.version = versionMatch[1].trim().substring(0, 50)
      }
      console.log('Extracted version:', app.version)
    } catch (error) {
      console.log('Error extracting version:', error)
    }

    try {
      // Extract last updated
      const updatedMatch = html.match(/<div[^>]*class="[^"]*updated[^"]*"[^>]*>([^<]+)/i)
      if (updatedMatch) {
        app.lastUpdated = updatedMatch[1].trim().substring(0, 100)
      }
      console.log('Extracted last updated:', app.lastUpdated)
    } catch (error) {
      console.log('Error extracting last updated:', error)
    }

    try {
      // Extract file size
      const sizeMatch = html.match(/<div[^>]*class="[^"]*size[^"]*"[^>]*>([^<]+)/i)
      if (sizeMatch) {
        app.fileSize = sizeMatch[1].trim().substring(0, 50)
      }
      console.log('Extracted file size:', app.fileSize)
    } catch (error) {
      console.log('Error extracting file size:', error)
    }

    try {
      // Extract requirements
      const reqMatch = html.match(/<div[^>]*class="[^"]*requirements[^"]*"[^>]*>([^<]+)/i)
      if (reqMatch) {
        app.requirements = reqMatch[1].trim().substring(0, 200)
      }
      console.log('Extracted requirements:', app.requirements)
    } catch (error) {
      console.log('Error extracting requirements:', error)
    }

    try {
      // Extract website
      const websiteMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>Visit Website<\/a>/i)
      if (websiteMatch) {
        app.website = websiteMatch[1].trim().substring(0, 255)
      }
      console.log('Extracted website:', app.website)
    } catch (error) {
      console.log('Error extracting website:', error)
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
              if (!app.screenshots.includes(screenshotUrl)) {
                app.screenshots.push(screenshotUrl)
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
              if (!app.screenshots.includes(screenshotUrl)) {
                app.screenshots.push(screenshotUrl)
              }
            }
          })
        }
      }
      
      // Fallback: general screenshot search if gallery method didn't work
      if (app.screenshots.length === 0) {
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
              if (!app.screenshots.includes(screenshotUrl)) {
                app.screenshots.push(screenshotUrl)
              }
            }
          })
        }
      }
      console.log(`Extracted ${app.screenshots.length} screenshots`)
    } catch (screenshotError) {
      console.error('Error extracting screenshots:', screenshotError)
    }

    // Extract icon with error handling
    try {
      const iconUrlMatch = html.match(/<img[^>]*class="[^"]*main_logo[^"]*"[^>]*src="([^"]+)"[^>]*>/) ||
                           html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*main_logo[^"]*"[^>]*>/)
      if (iconUrlMatch) {
        app.iconUrl = iconUrlMatch[1]
        if (app.iconUrl.startsWith('//')) {
          app.iconUrl = 'https:' + app.iconUrl
        } else if (app.iconUrl.startsWith('/')) {
          app.iconUrl = 'https://www.macupdate.com' + app.iconUrl
        }
      }
      console.log(`Extracted icon URL: ${app.iconUrl}`)
    } catch (iconError) {
      console.error('Error extracting icon:', iconError)
    }

    const finalApp: MacUpdateApp = {
      name: app.name,
      developer: app.developer,
      description: app.description,
      category: app.category,
      price: app.price,
      rating: app.rating,
      reviewCount: app.reviewCount,
      version: app.version,
      macUpdateUrl: url,
      lastUpdated: app.lastUpdated,
      fileSize: app.fileSize,
      requirements: app.requirements,
      website: app.website,
      screenshots: app.screenshots,
      iconUrl: app.iconUrl
    }

    console.log(`Successfully created app object:`, {
      name: finalApp.name,
      developer: finalApp.developer,
      category: finalApp.category,
      price: finalApp.price,
      rating: finalApp.rating,
      screenshots: finalApp.screenshots.length,
      iconUrl: !!finalApp.iconUrl
    })

    // Return the app object even if some fields are missing
    return finalApp

  } catch (error) {
    console.error('Error parsing app page:', error)
    return null
  }
} 