import { NextRequest, NextResponse } from 'next/server'
import { importMacUpdateAppsBatch } from '@/lib/macupdate-db'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 25000 // 25 seconds (leave 5 seconds buffer for Netlify)
  
  try {
    const body = await request.json()
    const { apps, categoryUrl } = body

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No apps provided for import' },
        { status: 400 }
      )
    }

    console.log(`Starting batch import of ${apps.length} apps${categoryUrl ? ` for category: ${categoryUrl}` : ''}`)

    // Check execution time periodically
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Request timeout - batch import taking too long')
      }
    }

    // Import apps in batch
    const result = await importMacUpdateAppsBatch(apps)
    
    checkTimeout()

    // Update import sessions if categoryUrl is provided
    if (categoryUrl && result.successful > 0) {
      try {
        // Find the most recent import session for this category
        const { data: sessions, error: sessionsError } = await supabase
          .from('import_sessions')
          .select('*')
          .eq('category_url', categoryUrl)
          .like('session_name', '%Page %')
          .order('created_at', { ascending: false })
          .limit(1)

        if (!sessionsError && sessions && sessions.length > 0) {
          const latestSession = sessions[0]
          
          // Update the session with actual import results
          const { error: updateError } = await supabase
            .from('import_sessions')
            .update({
              page_status: 'imported',
              apps_imported: result.successful,
              apps_skipped: result.failed,
              completed_at: new Date().toISOString()
            })
            .eq('id', latestSession.id)

          if (updateError) {
            console.error('Error updating import session:', updateError)
          } else {
            console.log(`Updated import session ${latestSession.id} with ${result.successful} imported apps`)
          }
        }
      } catch (sessionError) {
        console.error('Error updating import sessions:', sessionError)
        // Don't fail the entire import if session update fails
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`Batch import completed in ${executionTime}ms: ${result.successful} successful, ${result.failed} failed`)

    return NextResponse.json({
      success: true,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
      executionTime
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('MacUpdate import error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime
      },
      { status: 500 }
    )
  }
} 