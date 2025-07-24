import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = 'https://www.macupdate.com/find/mac?page=1&sort=computed_rank&price=paid'
    
    console.log('Debug: Fetching MacUpdate URL:', url)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.status}` })
    }

    const html = await response.text()
    
    // Extract some key information for debugging
    const appDivs = (html.match(/<div[^>]*class="[^"]*app[^"]*"[^>]*>/gi) || []).length
    const appLinks = (html.match(/href="\/app\/[^"]*"/gi) || []).length
    const h3Tags = (html.match(/<h3[^>]*>/gi) || []).length
    const strongTags = (html.match(/<strong[^>]*>/gi) || []).length
    
    // Look for any text that might be app names
    const potentialAppNames = html.match(/<[^>]*>([A-Z][a-zA-Z0-9\s&]+)<\/[^>]*>/g)?.slice(0, 20) || []
    
    // Get a sample of the HTML structure
    const sampleHtml = html.substring(0, 2000)
    
    return NextResponse.json({
      success: true,
      htmlLength: html.length,
      structure: {
        appDivs,
        appLinks,
        h3Tags,
        strongTags
      },
      potentialAppNames: potentialAppNames.slice(0, 10),
      sampleHtml
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
} 