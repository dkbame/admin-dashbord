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

    // Get category progress from import_sessions (fallback until migration is run)
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

    // Calculate category status from sessions
    const categoryName = sessions?.[0]?.session_name?.split(' - Page ')[0] || 'Unknown Category'
    const pages = sessions?.map(session => {
      const pageMatch = session.session_name.match(/Page (\d+)/)
      const pageNumber = pageMatch ? parseInt(pageMatch[1]) : 0
      
      const pageData = {
        pageNumber,
        sessionId: session.id,
        sessionName: session.session_name,
        status: session.page_status || 'scraped',
        createdAt: session.created_at,
        appsImported: session.apps_imported || 0,
        appsSkipped: session.apps_skipped || 0
      }
      
      console.log(`Page ${pageNumber} status: ${pageData.status}, apps imported: ${pageData.appsImported}`)
      
      return pageData
    }).sort((a, b) => a.pageNumber - b.pageNumber) || []

    const totalPages = Math.max(...pages.map(p => p.pageNumber), 0)
    const pagesScraped = pages.length
    const pagesImported = pages.filter(p => p.status === 'imported').length
    const pagesPending = pages.filter(p => p.status === 'scraped').length
    const lastScrapedPage = Math.max(...pages.map(p => p.pageNumber), 0)
    const lastImportedPage = Math.max(...pages.filter(p => p.status === 'imported').map(p => p.pageNumber), 0)
    const scrapeProgressPercent = totalPages > 0 ? Math.round((pagesScraped / totalPages) * 100) : 0
    const importProgressPercent = pagesScraped > 0 ? Math.round((pagesImported / pagesScraped) * 100) : 0



    const result = {
      categoryUrl,
      categoryName,
      totalPages,
      pagesScraped,
      pagesImported,
      pagesPending,
      lastScrapedPage,
      lastImportedPage,
      scrapeProgressPercent,
      importProgressPercent,
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryUrl = searchParams.get('categoryUrl')

    if (!categoryUrl) {
      return NextResponse.json({ 
        error: 'Category URL is required' 
      }, { status: 400 })
    }

    console.log('Clearing import sessions for category:', categoryUrl)

    // Delete all import sessions for this category
    const { error: deleteError } = await supabase
      .from('import_sessions')
      .delete()
      .eq('category_url', categoryUrl)

    if (deleteError) {
      console.error('Error clearing import sessions:', deleteError)
      return NextResponse.json({
        error: `Database error: ${deleteError.message}`
      }, { status: 500 })
    }

    console.log('Successfully cleared import sessions for category:', categoryUrl)

    return NextResponse.json({
      success: true,
      message: 'Category progress reset successfully'
    })

  } catch (error) {
    console.error('Error clearing category progress:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to clear category progress'
    }, { status: 500 })
  }
} 