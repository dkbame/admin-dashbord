import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryUrl = searchParams.get('categoryUrl')

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Getting category progress for:', categoryUrl)

    // Get category progress from the view
    const { data: categoryStatus, error: statusError } = await supabase
      .from('category_status')
      .select('*')
      .eq('category_url', categoryUrl)
      .single()

    if (statusError && statusError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting category status:', statusError)
      return NextResponse.json({
        error: `Database error: ${statusError.message}`
      }, { status: 500 })
    }

    // Get all import sessions for this category
    const { data: sessions, error: sessionsError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('category_url', categoryUrl)
      .like('session_name', '%Page %')
      .order('created_at', { ascending: true })

    if (sessionsError) {
      console.error('Error getting import sessions:', sessionsError)
      return NextResponse.json({
        error: `Database error: ${sessionsError.message}`
      }, { status: 500 })
    }

    // Parse page information from sessions
    const pages = sessions?.map(session => {
      const pageMatch = session.session_name.match(/Page (\d+)/)
      const pageNumber = pageMatch ? parseInt(pageMatch[1]) : 0
      
      return {
        pageNumber,
        sessionId: session.id,
        sessionName: session.session_name,
        status: session.page_status || 'scraped',
        createdAt: session.created_at,
        appsImported: session.apps_imported || 0,
        appsSkipped: session.apps_skipped || 0
      }
    }).sort((a, b) => a.pageNumber - b.pageNumber) || []

    // Calculate summary statistics
    const totalPages = Math.max(...pages.map(p => p.pageNumber), 0)
    const pagesScraped = pages.length
    const pagesImported = pages.filter(p => p.status === 'imported').length
    const pagesPending = pages.filter(p => p.status === 'scraped').length

    const result = {
      categoryUrl,
      categoryName: categoryStatus?.category_name || 'Unknown Category',
      totalPages,
      pagesScraped,
      pagesImported,
      pagesPending,
      lastScrapedPage: categoryStatus?.last_scraped_page || 0,
      lastImportedPage: categoryStatus?.last_imported_page || 0,
      scrapeProgressPercent: categoryStatus?.scrape_progress_percent || 0,
      importProgressPercent: categoryStatus?.import_progress_percent || 0,
      pages: pages,
      summary: {
        totalPages,
        pagesScraped,
        pagesImported,
        pagesPending,
        nextPageToScrape: totalPages + 1,
        nextPageToImport: pages.find(p => p.status === 'scraped')?.pageNumber || null
      }
    }

    console.log('Category progress result:', result)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Category progress error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get category progress'
    }, { status: 500 })
  }
} 