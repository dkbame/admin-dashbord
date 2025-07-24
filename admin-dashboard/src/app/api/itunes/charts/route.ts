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

    // Use direct search approach for better reliability
    const searchTerms = {
      'topfreeapplications': 'free mac apps',
      'toppaidapplications': 'paid mac apps',
      'topgrossingapplications': 'popular mac apps'
    }

    const searchTerm = searchTerms[chart as keyof typeof searchTerms] || 'mac apps'
    
    const itunesUrl = new URL('https://itunes.apple.com/search')
    itunesUrl.searchParams.set('term', searchTerm)
    itunesUrl.searchParams.set('entity', entity)
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

    return NextResponse.json({
      results: data.results || []
    })

  } catch (error) {
    console.error('Error fetching iTunes charts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch charts' },
      { status: 500 }
    )
  }
} 