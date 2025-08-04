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

    console.log(`📥 Batch import request received:`)
    console.log(`   - apps count: ${apps?.length || 0}`)
    console.log(`   - categoryUrl: "${categoryUrl}"`)
    console.log(`   - categoryUrl type: ${typeof categoryUrl}`)
    console.log(`   - categoryUrl undefined: ${categoryUrl === undefined}`)
    console.log(`   - categoryUrl null: ${categoryUrl === null}`)
    console.log(`   - categoryUrl empty: ${categoryUrl === ''}`)
    console.log(`   - categoryUrl is "undefined" string: ${categoryUrl === "undefined"}`)

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No apps provided for import' },
        { status: 400 }
      )
    }

    // Handle the case where categoryUrl is the string "undefined"
    let actualCategoryUrl = categoryUrl
    if (categoryUrl === "undefined" || categoryUrl === undefined || categoryUrl === null || categoryUrl === "") {
      console.log(`⚠️ categoryUrl is invalid, attempting to extract from apps...`)
      
      // Try to extract category URL from the first app's macupdate_url
      if (apps.length > 0 && apps[0].macupdate_url) {
        const appUrl = apps[0].macupdate_url
        // Extract category URL from app URL: https://www.macupdate.com/app/mac/12345/app-name -> https://www.macupdate.com/explore/categories/category-name
        const urlMatch = appUrl.match(/https:\/\/www\.macupdate\.com\/app\/mac\/\d+\/([^\/]+)/)
        if (urlMatch) {
          // This is a fallback - we'll use a generic category URL since we can't determine the exact category
          actualCategoryUrl = "https://www.macupdate.com/explore/categories/system-utilities"
          console.log(`🔧 Using fallback category URL: ${actualCategoryUrl}`)
        }
      }
    }

    console.log(`Starting batch import of ${apps.length} apps${actualCategoryUrl ? ` for category: ${actualCategoryUrl}` : ''}`)

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
    if (actualCategoryUrl && result.successful > 0) {
      try {
        console.log(`Attempting to update import sessions for category: ${actualCategoryUrl}`)
        
        // Find the most recent import session for this category
        const { data: sessions, error: sessionsError } = await supabase
          .from('import_sessions')
          .select('*')
          .eq('category_url', actualCategoryUrl)
          .like('session_name', '%Page %')
          .order('created_at', { ascending: false })
          .limit(1)

        if (sessionsError) {
          console.error('Error finding import sessions:', sessionsError)
        } else if (sessions && sessions.length > 0) {
          const latestSession = sessions[0]
          console.log(`Found import session: ${latestSession.id}, current status: ${latestSession.page_status}`)
          
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
            console.log(`Successfully updated import session ${latestSession.id} with ${result.successful} imported apps, status: imported`)
          }
        } else {
          console.log('No import sessions found for category:', actualCategoryUrl)
        }
      } catch (sessionError) {
        console.error('Error updating import sessions:', sessionError)
        // Don't fail the entire import if session update fails
      }
    } else {
      console.log(`Skipping import session update - categoryUrl: ${actualCategoryUrl}, successful imports: ${result.successful}`)
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