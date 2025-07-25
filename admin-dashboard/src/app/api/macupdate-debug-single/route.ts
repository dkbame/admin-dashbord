import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || !url.includes('macupdate.com')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please provide a valid MacUpdate URL' 
      }, { status: 400 })
    }

    console.log(`Debug fetching MacUpdate app: ${url}`)

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
    console.log(`Fetched HTML length: ${html.length}`)

    // Extract key sections for debugging
    const debugInfo: {
      htmlLength: number
      title: string
      h1Elements: string[]
      mainDataDiv: string
      galleryDiv: string
      logoImg: string
      sampleHtml: string
      searchResults: {
        h1Count: number
        mainDataCount: number
        galleryCount: number
        logoCount: number
      }
    } = {
      htmlLength: html.length,
      title: html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || 'No title found',
      h1Elements: [],
      mainDataDiv: '',
      galleryDiv: '',
      logoImg: '',
      sampleHtml: html.substring(0, 2000) + '...',
      searchResults: {
        h1Count: (html.match(/<h1[^>]*>/g) || []).length,
        mainDataCount: (html.match(/class="[^"]*main_data[^"]*"/g) || []).length,
        galleryCount: (html.match(/class="[^"]*mu_app_gallery[^"]*"/g) || []).length,
        logoCount: (html.match(/class="[^"]*main_logo[^"]*"/g) || []).length
      }
    }

    // Extract all H1 elements
    const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/g)
    if (h1Matches) {
      debugInfo.h1Elements = h1Matches.slice(0, 5) // First 5 H1 elements
    }

    // Extract main_data div if it exists
    const mainDataMatch = html.match(/<div[^>]*class="[^"]*main_data[^"]*"[^>]*>[\s\S]*?<\/div>/i)
    if (mainDataMatch) {
      debugInfo.mainDataDiv = mainDataMatch[0].substring(0, 1000) + '...'
    }

    // Extract gallery div if it exists
    const galleryMatch = html.match(/<div[^>]*class="[^"]*mu_app_gallery[^"]*"[^>]*>[\s\S]*?<\/div>/i)
    if (galleryMatch) {
      debugInfo.galleryDiv = galleryMatch[0].substring(0, 1000) + '...'
    }

    // Extract logo img if it exists
    const logoMatch = html.match(/<img[^>]*class="[^"]*main_logo[^"]*"[^>]*>/)
    if (logoMatch) {
      debugInfo.logoImg = logoMatch[0]
    }

    return NextResponse.json({
      success: true,
      url: url,
      debugInfo: debugInfo
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Debug failed' 
    }, { status: 500 })
  }
} 