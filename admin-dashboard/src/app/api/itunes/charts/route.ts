import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chart = searchParams.get('chart')
    const entity = searchParams.get('entity') || 'macSoftware'
    const limit = searchParams.get('limit') || '50'
    const country = searchParams.get('country') || 'us'

    if (!chart) {
      return NextResponse.json(
        { error: 'Chart parameter is required' },
        { status: 400 }
      )
    }

    // Validate chart type
    const validCharts = [
      'topfreeapplications',
      'toppaidapplications',
      'topgrossingapplications',
      'topfreeipadapplications',
      'toppaidipadapplications',
      'topgrossingipadapplications'
    ]

    if (!validCharts.includes(chart)) {
      return NextResponse.json(
        { error: 'Invalid chart type' },
        { status: 400 }
      )
    }

    // For Mac App Store, we need to scrape the actual charts since iTunes API doesn't provide Mac charts
    // Let's use a more targeted search approach for better results
    let searchTerm = 'mac app'
    let priceFilter = ''
    
    if (chart === 'topfreeapplications') {
      searchTerm = 'mac app free'
      priceFilter = 'free'
    } else if (chart === 'toppaidapplications') {
      searchTerm = 'mac app paid'
      priceFilter = 'paid'
    } else if (chart === 'topgrossingapplications') {
      searchTerm = 'mac productivity'
    }
    
    const itunesUrl = new URL('https://itunes.apple.com/search')
    itunesUrl.searchParams.set('term', searchTerm)
    itunesUrl.searchParams.set('entity', 'macSoftware')
    itunesUrl.searchParams.set('limit', limit)
    itunesUrl.searchParams.set('country', country)
    itunesUrl.searchParams.set('media', 'software')

    console.log('Fetching iTunes apps:', itunesUrl.toString())

    const response = await fetch(itunesUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()

    console.log('iTunes API response:', {
      resultCount: data.resultCount,
      results: data.results?.length || 0
    })

    // Filter to ensure we only get macOS apps and apply price filtering
    const macApps = (data.results || []).filter((app: any) => {
      // Check for iOS-specific indicators
      const isDefinitelyiOS = app.kind === 'software' || // iOS apps have kind="software"
                              app.features?.includes('iosUniversal') ||
                              app.screenshotUrls?.some((url: string) => url.includes('392x696') || url.includes('iPhone')) ||
                              app.ipadScreenshotUrls?.length > 0 ||
                              app.trackName?.toLowerCase().includes('iphone') ||
                              app.trackName?.toLowerCase().includes('ipad') ||
                              app.description?.toLowerCase().includes('iphone') ||
                              app.description?.toLowerCase().includes('ipad')
      
      // Only include true macOS apps (kind should be 'mac-software')
      const isMacApp = app.kind === 'mac-software'
      
      // Apply price filtering
      let priceMatches = true
      if (priceFilter === 'free') {
        priceMatches = app.price === 0 || app.price === undefined
      } else if (priceFilter === 'paid') {
        priceMatches = app.price > 0
      }
      
      return isMacApp && !isDefinitelyiOS && priceMatches
    })

    console.log('Filtered macOS apps:', {
      original: data.results?.length || 0,
      filtered: macApps.length
    })

    // Apply the user's limit to the filtered results
    const limitedApps = macApps.slice(0, parseInt(limit))
    
    console.log('Final limited apps:', {
      filtered: macApps.length,
      limited: limitedApps.length,
      requestedLimit: limit
    })

    return NextResponse.json({
      results: limitedApps
    })

  } catch (error) {
    console.error('Error fetching iTunes charts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch charts' },
      { status: 500 }
    )
  }
} 