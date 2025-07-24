import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chartType = searchParams.get('type') || 'top-paid' // 'top-paid', 'top-free', 'top-grossing'
    const limit = parseInt(searchParams.get('limit') || '50')
    const country = searchParams.get('country') || 'us'

    console.log(`Scraping Mac App Store charts: ${chartType} for ${country}`)

    // Mac App Store charts URLs
    const chartUrls = {
      'top-paid': `https://apps.apple.com/${country}/mac/top-paid-apps`,
      'top-free': `https://apps.apple.com/${country}/mac/top-free-apps`,
      'top-grossing': `https://apps.apple.com/${country}/mac/top-grossing-apps`
    }

    const url = chartUrls[chartType as keyof typeof chartUrls]
    if (!url) {
      return NextResponse.json(
        { error: 'Invalid chart type. Use: top-paid, top-free, or top-grossing' },
        { status: 400 }
      )
    }

    console.log('Scraping URL:', url)

    const response = await fetch(url, {
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
      throw new Error(`Mac App Store request failed: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract app IDs from the HTML
    // Look for patterns like: /mac/app/[app-name]/id[number]
    const appIdMatches = html.match(/\/mac\/app\/[^\/]+\/id(\d+)/g)
    
    if (!appIdMatches) {
      console.log('No app IDs found in Mac App Store page')
      return NextResponse.json({ results: [] })
    }

    // Extract unique app IDs
    const appIds = [...new Set(appIdMatches.map(match => match.match(/id(\d+)/)?.[1]).filter(Boolean))]
    
    console.log(`Found ${appIds.length} unique app IDs in Mac App Store charts`)

    // Limit to requested amount
    const limitedAppIds = appIds.slice(0, limit)

    // Fetch detailed app data for each ID using iTunes API
    const apps = []
    for (const appId of limitedAppIds) {
      try {
        const itunesResponse = await fetch(`https://itunes.apple.com/lookup?id=${appId}&entity=macSoftware&country=${country}`)
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json()
          
          if (itunesData.results && itunesData.results.length > 0) {
            const app = itunesData.results[0]
            
            // Only include macOS apps
            if (app.kind === 'mac-software') {
              apps.push({
                trackId: app.trackId,
                trackName: app.trackName,
                artistName: app.artistName,
                trackViewUrl: app.trackViewUrl,
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
                description: app.description,
                kind: app.kind,
                bundleId: app.bundleId
              })
            }
          }
        }
        
        // Small delay to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Error fetching app ${appId}:`, error)
        // Continue with other apps
      }
    }

    console.log(`Successfully fetched ${apps.length} apps from Mac App Store charts`)

    return NextResponse.json({
      resultCount: apps.length,
      results: apps
    })

  } catch (error) {
    console.error('Error scraping Mac App Store charts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape Mac App Store charts' },
      { status: 500 }
    )
  }
} 