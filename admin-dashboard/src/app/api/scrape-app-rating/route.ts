import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('id')
    const country = searchParams.get('country') || 'us'

    if (!appId) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      )
    }

    // Build the App Store URL for the specific country
    const appStoreUrl = `https://apps.apple.com/${country}/app/id${appId}`
    
    console.log('Scraping App Store ratings from:', appStoreUrl)

    const response = await fetch(appStoreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!response.ok) {
      throw new Error(`App Store request failed: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract rating and review count from the HTML
    let rating = 0
    let reviewCount = 0
    
    // Look for rating pattern like "4.9 out of 5"
    const ratingMatch = html.match(/(\d+\.?\d*)\s+out\s+of\s+5/)
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1])
    }
    
    // Look for review count pattern like "15.7K Ratings" or "1,234 Ratings"
    const reviewMatch = html.match(/([\d,]+\.?\d*[KMB]?)\s+Ratings/i)
    if (reviewMatch) {
      const reviewText = reviewMatch[1]
      // Convert K, M, B to numbers
      if (reviewText.includes('K')) {
        reviewCount = Math.round(parseFloat(reviewText.replace('K', '')) * 1000)
      } else if (reviewText.includes('M')) {
        reviewCount = Math.round(parseFloat(reviewText.replace('M', '')) * 1000000)
      } else if (reviewText.includes('B')) {
        reviewCount = Math.round(parseFloat(reviewText.replace('B', '')) * 1000000000)
      } else {
        reviewCount = parseInt(reviewText.replace(/,/g, ''))
      }
    }

    console.log(`Scraped ratings for app ${appId}:`, { rating, reviewCount })

    return NextResponse.json({
      rating,
      reviewCount,
      url: appStoreUrl
    })

  } catch (error) {
    console.error('Error scraping App Store ratings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape ratings' },
      { status: 500 }
    )
  }
} 