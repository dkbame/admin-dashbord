import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test with a simple search
    const testUrl = 'https://itunes.apple.com/search?term=productivity&entity=macSoftware&limit=5&country=us&media=software'
    
    console.log('Testing iTunes API with URL:', testUrl)
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      resultCount: data.resultCount,
      results: data.results?.slice(0, 3) || [], // Return first 3 results for testing
      testUrl: testUrl
    })

  } catch (error) {
    console.error('iTunes API test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testUrl: 'https://itunes.apple.com/search?term=productivity&entity=macSoftware&limit=5&country=us&media=software'
      },
      { status: 500 }
    )
  }
} 