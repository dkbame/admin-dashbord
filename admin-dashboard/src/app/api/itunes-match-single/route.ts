import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { iTunesMatchingService } from '@/lib/itunes-api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { appId } = await request.json()
    
    console.log('iTunes Match Single API called with appId:', appId)
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 })
    }
    
    // Get the app details
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, name, developer, mas_id, mas_url')
      .eq('id', appId)
      .single()
    
    if (appError) {
      console.error('Error fetching app:', appError)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }
    
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }
    
    console.log(`Searching iTunes for: ${app.name} by ${app.developer}`)
    
    // Search iTunes API
    const matchResult = await iTunesMatchingService.searchApp(app.name, app.developer)
    
    console.log('iTunes match result:', matchResult)
    
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
      } else {
        attempt = attemptData
        console.log('Successfully saved attempt:', attempt)
      }
    } catch (upsertError) {
      console.error('Upsert error:', upsertError)
    }
    
    // Auto-apply high-confidence matches (80%+)
    if (matchResult.found && matchResult.confidence >= 0.8) {
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
    
    const result = {
      appId: app.id,
      appName: app.name,
      found: matchResult.found,
      confidence: matchResult.confidence,
      masId: matchResult.masId,
      masUrl: matchResult.masUrl,
      error: matchResult.error,
      autoApplied: matchResult.found && matchResult.confidence >= 0.8
    }
    
    console.log('iTunes matching result:', result)
    
    return NextResponse.json({
      success: true,
      result
    })
    
  } catch (error) {
    console.error('iTunes Match Single API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 