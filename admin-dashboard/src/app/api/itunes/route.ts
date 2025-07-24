import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const term = searchParams.get('term')
    const entity = searchParams.get('entity') || 'macSoftware'
    const limit = searchParams.get('limit') || '50'
    const country = searchParams.get('country') || 'us'

    if (!id && !term) {
      return NextResponse.json(
        { error: 'Either id or term parameter is required' },
        { status: 400 }
      )
    }

    let url: string

    if (id) {
      // Single app lookup - add country parameter for better data
      url = `https://itunes.apple.com/lookup?id=${id}&entity=${entity}&country=${country}`
    } else if (term) {
      // Search for apps
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=${limit}&country=${country}&media=software`
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    console.log('Fetching from iTunes API:', url)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MacAppStoreBot/1.0)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Debug: Log the response structure for single app lookups
    if (id && data.results && data.results.length > 0) {
      const app = data.results[0]
      console.log(`iTunes API response for app ${id}:`, {
        trackName: app.trackName,
        averageUserRating: app.averageUserRating,
        userRatingCount: app.userRatingCount,
        averageUserRatingForCurrentVersion: app.averageUserRatingForCurrentVersion,
        userRatingCountForCurrentVersion: app.userRatingCountForCurrentVersion,
        hasRating: !!app.averageUserRating,
        hasRatingCount: !!app.userRatingCount
      })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching from iTunes API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch from iTunes API' },
      { status: 500 }
    )
  }
} 