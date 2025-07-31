import { NextRequest, NextResponse } from 'next/server'
import { MacUpdateCategoryScraper } from '@/lib/macupdate-scraper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const categoryUrl = searchParams.get('url')
    const limit = parseInt(searchParams.get('limit') || '5') // Very small limit for testing

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Testing MacUpdate scraping with minimal workload:', categoryUrl, 'with limit:', limit)

    const categoryScraper = new MacUpdateCategoryScraper()
    
    // Use the new pagination method that gets the next unprocessed page
    const result = await categoryScraper.getNewAppsOnlyWithPagination(categoryUrl, limit)
    
    const executionTime = Date.now() - startTime
    console.log(`Test scraping completed in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      categoryName: result.categoryName,
      totalApps: result.totalApps,
      newApps: result.newApps,
      existingApps: result.existingApps,
      appUrls: result.appUrls,
      executionTime,
      note: 'Test endpoint - no preview data retrieved for speed'
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Test scraping error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to test scraping',
      executionTime
    }, { status: 500 })
  }
} 