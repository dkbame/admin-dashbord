import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chartType = searchParams.get('type') || 'top-paid' // 'top-paid', 'top-free', 'top-grossing'
    const limit = parseInt(searchParams.get('limit') || '50')
    const country = searchParams.get('country') || 'us'

    console.log(`Fetching Mac apps for: ${chartType} for ${country}`)

    // Use popular search terms to get high-quality apps
    const searchTerms = {
      'top-paid': [
        'final cut pro',
        'logic pro', 
        'parallels desktop',
        'adobe photoshop',
        'adobe illustrator',
        'microsoft office',
        'sketch',
        'figma',
        'notion',
        'slack',
        'zoom',
        'spotify',
        'netflix',
        'dropbox',
        '1password'
      ],
      'top-free': [
        'chrome',
        'firefox',
        'safari',
        'discord',
        'telegram',
        'whatsapp',
        'vscode',
        'xcode',
        'git',
        'homebrew',
        'brew',
        'terminal',
        'calculator',
        'notes',
        'calendar'
      ],
      'top-grossing': [
        'productivity',
        'business',
        'design',
        'development',
        'video editing',
        'photo editing',
        'music production',
        'gaming',
        'education',
        'finance'
      ]
    }

    const terms = searchTerms[chartType as keyof typeof searchTerms] || searchTerms['top-paid']
    const apps: any[] = []
    const seenAppIds = new Set<string>()

    // Search for each term and collect unique apps
    for (const term of terms) {
      if (apps.length >= limit) break

      try {
        const itunesUrl = new URL('https://itunes.apple.com/search')
        itunesUrl.searchParams.set('term', term)
        itunesUrl.searchParams.set('entity', 'macSoftware')
        itunesUrl.searchParams.set('limit', '20')
        itunesUrl.searchParams.set('country', country)
        itunesUrl.searchParams.set('media', 'software')

        console.log(`Searching for: ${term}`)

        const response = await fetch(itunesUrl.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          console.error(`Failed to search for ${term}: ${response.status}`)
          continue
        }

        const data = await response.json()
        
        if (data.results) {
          for (const app of data.results) {
            // Only include macOS apps and avoid duplicates
            if (app.kind === 'mac-software' && !seenAppIds.has(app.trackId.toString())) {
              // Apply price filtering
              let shouldInclude = true
              if (chartType === 'top-paid') {
                shouldInclude = app.price > 0
              } else if (chartType === 'top-free') {
                shouldInclude = app.price === 0 || app.price === undefined
              }

              if (shouldInclude) {
                seenAppIds.add(app.trackId.toString())
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

                if (apps.length >= limit) break
              }
            }
          }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`Error searching for ${term}:`, error)
        continue
      }
    }

    console.log(`Successfully fetched ${apps.length} apps for ${chartType}`)

    return NextResponse.json({
      resultCount: apps.length,
      results: apps
    })

  } catch (error) {
    console.error('Error fetching Mac apps:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Mac apps' },
      { status: 500 }
    )
  }
} 