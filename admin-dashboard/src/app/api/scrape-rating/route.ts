import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate that it's an App Store URL
    if (!url.includes('apps.apple.com')) {
      return NextResponse.json(
        { error: 'Invalid App Store URL' },
        { status: 400 }
      )
    }

    console.log('Scraping ratings from:', url)

    // Fetch the App Store page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch App Store page: ${response.status}`)
    }

    const html = await response.text()

    // Extract rating information using regex patterns
    let averageRating = 0
    let ratingCount = 0

    // Try to find rating in the HTML
    const ratingMatch = html.match(/"averageUserRating":\s*(\d+\.?\d*)/)
    if (ratingMatch) {
      averageRating = parseFloat(ratingMatch[1])
    }

    const countMatch = html.match(/"userRatingCount":\s*(\d+)/)
    if (countMatch) {
      ratingCount = parseInt(countMatch[1])
    }

    // Fallback: try alternative patterns
    if (averageRating === 0) {
      const altRatingMatch = html.match(/rating["\s]*:["\s]*(\d+\.?\d*)/i)
      if (altRatingMatch) {
        averageRating = parseFloat(altRatingMatch[1])
      }
    }

    if (ratingCount === 0) {
      const altCountMatch = html.match(/reviews?["\s]*:["\s]*(\d+)/i)
      if (altCountMatch) {
        ratingCount = parseInt(altCountMatch[1])
      }
    }

    console.log('Scraped ratings:', { averageRating, ratingCount })

    return NextResponse.json({
      average: averageRating,
      count: ratingCount,
      url: url
    })

  } catch (error) {
    console.error('Error scraping ratings:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scrape ratings',
        average: 0,
        count: 0
      },
      { status: 500 }
    )
  }
} 