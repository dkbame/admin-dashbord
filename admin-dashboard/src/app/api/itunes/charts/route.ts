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

    // Build iTunes API URL
    const itunesUrl = new URL('https://itunes.apple.com/lookup')
    itunesUrl.searchParams.set('id', chart)
    itunesUrl.searchParams.set('entity', entity)
    itunesUrl.searchParams.set('limit', limit)
    itunesUrl.searchParams.set('country', country)

    console.log('Fetching iTunes chart:', itunesUrl.toString())

    const response = await fetch(itunesUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MacAppStoreBot/1.0)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // If this is a chart lookup, we need to get the actual apps
    if (data.results && data.results.length > 0 && data.results[0].feed) {
      const feedUrl = data.results[0].feed.url
      console.log('Fetching chart feed:', feedUrl)

      const feedResponse = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MacAppStoreBot/1.0)',
          'Accept': 'application/json'
        }
      })

      if (!feedResponse.ok) {
        throw new Error(`Chart feed responded with status: ${feedResponse.status}`)
      }

      const feedData = await feedResponse.json()
      
      // Extract apps from the feed
      const apps = feedData.feed?.results || []
      
      return NextResponse.json({
        results: apps.map((app: any) => ({
          trackId: app.id,
          trackName: app.name,
          artistName: app.artistName,
          trackViewUrl: app.url,
          artworkUrl512: app.artworkUrl512,
          artworkUrl100: app.artworkUrl100,
          averageUserRating: app.averageUserRating,
          userRatingCount: app.userRatingCount,
          price: app.price,
          currency: app.currency,
          primaryGenreName: app.primaryGenreName,
          minimumOsVersion: app.minimumOsVersion,
          version: app.version,
          fileSizeBytes: app.fileSizeBytes,
          releaseDate: app.releaseDate,
          currentVersionReleaseDate: app.currentVersionReleaseDate,
          features: app.features,
          screenshotUrls: app.screenshotUrls,
          description: app.description
        }))
      })
    }

    // Fallback: try to get apps directly
    const appsUrl = new URL('https://itunes.apple.com/search')
    appsUrl.searchParams.set('term', chart)
    appsUrl.searchParams.set('entity', entity)
    appsUrl.searchParams.set('limit', limit)
    appsUrl.searchParams.set('country', country)
    appsUrl.searchParams.set('media', 'software')

    console.log('Fetching apps directly:', appsUrl.toString())

    const appsResponse = await fetch(appsUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MacAppStoreBot/1.0)',
        'Accept': 'application/json'
      }
    })

    if (!appsResponse.ok) {
      throw new Error(`iTunes search API responded with status: ${appsResponse.status}`)
    }

    const appsData = await appsResponse.json()

    return NextResponse.json({
      results: appsData.results || []
    })

  } catch (error) {
    console.error('Error fetching iTunes charts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch charts' },
      { status: 500 }
    )
  }
} 