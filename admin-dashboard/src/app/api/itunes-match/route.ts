import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { iTunesMatchingService } from '@/lib/itunes-api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { appIds, autoApply = false } = await request.json()
    
    console.log('iTunes Match API called with:', { appIds, autoApply })
    
    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return NextResponse.json({ error: 'appIds array is required' }, { status: 400 })
    }
    
    // Get apps that don't already have MAS data
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('id, name, developer, mas_id, mas_url')
      .in('id', appIds)
      .or('mas_id.is.null,mas_url.is.null')
    
    if (appsError) {
      console.error('Error fetching apps:', appsError)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }
    
    console.log(`Found ${apps.length} apps without MAS data`)
    
    const results = []
    const batchSize = 5 // Reduced from 10 to 5 to prevent timeouts
    
    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(apps.length / batchSize)}`)
      
      for (const app of batch) {
        try {
          console.log(`Searching for: ${app.name} by ${app.developer}`)
          
          // Search iTunes API
          const matchResult = await iTunesMatchingService.searchApp(app.name, app.developer)
          
          // Create or update match attempt record
          let attempt = null
          try {
            const { data: attemptData, error: attemptError } = await supabase
              .from('itunes_match_attempts')
              .upsert({
                app_id: app.id,
                search_term: app.name,
                developer_name: app.developer,
                itunes_response: matchResult.itunesData || null,
                confidence_score: matchResult.confidence,
                status: matchResult.found ? 'found' : 'failed',
                mas_id: matchResult.masId || null,
                mas_url: matchResult.masUrl || null,
                error_message: matchResult.error || null
              })
              .select()
              .single()
            
            if (attemptError) {
              console.error('Error saving attempt:', attemptError)
              console.error('Attempt data that failed:', {
                app_id: app.id,
                search_term: app.name,
                developer_name: app.developer,
                confidence_score: matchResult.confidence,
                status: matchResult.found ? 'found' : 'failed',
                mas_id: matchResult.masId || null,
                mas_url: matchResult.masUrl || null,
                error_message: matchResult.error || null
              })
              
              // Check if it's a table doesn't exist error
              if (attemptError.code === '42P01') {
                console.error('Table itunes_match_attempts does not exist. Please run the migration.')
              }
            } else {
              attempt = attemptData
              console.log('Successfully saved attempt:', attempt)
            }
          } catch (upsertError) {
            console.error('Upsert error:', upsertError)
            console.error('Upsert error details:', {
              message: upsertError instanceof Error ? upsertError.message : 'Unknown error',
              stack: upsertError instanceof Error ? upsertError.stack : undefined
            })
          }
          
          // Auto-apply high-confidence matches (80%+) (reduced from 95%)
          if (autoApply && matchResult.found && matchResult.confidence >= 0.8) {
            console.log(`Auto-applying high-confidence match for ${app.name}`)
            
            // Only update the specific MAS fields, don't touch other fields
            const updateData = {
              mas_id: matchResult.masId,
              mas_url: matchResult.masUrl,
              is_on_mas: true
            }
            
            console.log('Updating app with MAS data:', updateData)
            
            const { error: updateError } = await supabase
              .from('apps')
              .update(updateData)
              .eq('id', app.id)
            
            if (updateError) {
              console.error('Error updating app:', updateError)
            } else {
              console.log('Successfully updated app with MAS data')
              // Update attempt status to confirmed (only if attempt was created successfully)
              if (attempt && attempt.id) {
                await supabase
                  .from('itunes_match_attempts')
                  .update({ status: 'confirmed' })
                  .eq('id', attempt.id)
              }
            }
          }
          
          results.push({
            appId: app.id,
            appName: app.name,
            found: matchResult.found,
            confidence: matchResult.confidence,
            masId: matchResult.masId,
            masUrl: matchResult.masUrl,
            error: matchResult.error || null,
            autoApplied: autoApply && matchResult.found && matchResult.confidence >= 0.8
          })
          
          // Rate limiting delay
          await iTunesMatchingService.delay()
          
        } catch (error) {
          console.error(`Error processing app ${app.name}:`, error)
          results.push({
            appId: app.id,
            appName: app.name,
            found: false,
            confidence: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }
    
    const summary = {
      total: results.length,
      found: results.filter(r => r.found).length,
      autoApplied: results.filter(r => r.autoApplied).length,
      failed: results.filter(r => !r.found).length,
      results
    }
    
    console.log('iTunes matching summary:', summary)
    
    return NextResponse.json({
      success: true,
      summary,
      results
    })
    
  } catch (error) {
    console.error('iTunes Match API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')
    
    if (appId) {
      // Get matching attempts for a specific app
      const { data: attempts, error } = await supabase
        .from('itunes_match_attempts')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching attempts:', error)
        return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
      }
      
      return NextResponse.json(attempts)
    } else {
      // Get all matching results
      const { data: results, error } = await supabase
        .from('itunes_matching_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching results:', error)
        return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
      }
      
      return NextResponse.json(results)
    }
    
  } catch (error) {
    console.error('iTunes Match GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 