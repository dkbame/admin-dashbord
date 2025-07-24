import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const entity = searchParams.get('entity') || 'macSoftware'
    const limit = searchParams.get('limit') || '50'
    const country = searchParams.get('country') || 'us'

    if (!term) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      )
    }

    console.log('Searching iTunes for:', { term, entity, limit, country })

    // Build iTunes search URL
    const itunesUrl = new URL('https://itunes.apple.com/search')
    itunesUrl.searchParams.set('term', term)
    itunesUrl.searchParams.set('entity', entity)
    itunesUrl.searchParams.set('limit', limit)
    itunesUrl.searchParams.set('country', country)
    itunesUrl.searchParams.set('media', 'software')

    console.log('iTunes search URL:', itunesUrl.toString())

    const response = await fetch(itunesUrl.toString())
    
    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()

    console.log('iTunes search response:', {
      resultCount: data.resultCount,
      results: data.results?.length || 0
    })

    // Filter to ensure we only get macOS apps
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
      
      return isMacApp && !isDefinitelyiOS
    })

    console.log('Filtered macOS apps from search:', {
      original: data.results?.length || 0,
      filtered: macApps.length
    })

    // Apply the user's limit to the filtered results
    const limitedApps = macApps.slice(0, parseInt(limit))
    
    console.log('Final limited search results:', {
      filtered: macApps.length,
      limited: limitedApps.length,
      requestedLimit: limit
    })

    return NextResponse.json({
      results: limitedApps
    })

  } catch (error) {
    console.error('Error searching iTunes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search iTunes' },
      { status: 500 }
    )
  }
} 