import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { appId } = await request.json()

    if (!appId) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      )
    }

    console.log('=== DEBUG DELETE OPERATION ===')
    console.log('App ID:', appId)

    // Step 1: Check if app exists
    const { data: existingApp, error: checkError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', appId)
      .single()

    console.log('Step 1 - App exists check:', { existingApp, checkError })

    if (checkError || !existingApp) {
      return NextResponse.json(
        { error: 'App not found', checkError },
        { status: 404 }
      )
    }

    // Step 2: Check for related records
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('*')
      .eq('app_id', appId)

    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('*')
      .eq('app_id', appId)

    const { data: collectionApps, error: collectionAppsError } = await supabase
      .from('collection_apps')
      .select('*')
      .eq('app_id', appId)

    const { data: customMetadata, error: customMetadataError } = await supabase
      .from('custom_metadata')
      .select('*')
      .eq('app_id', appId)

    console.log('Step 2 - Related records:', {
      screenshots: screenshots?.length || 0,
      ratings: ratings?.length || 0,
      collectionApps: collectionApps?.length || 0,
      customMetadata: customMetadata?.length || 0
    })

    // Step 3: Get total apps before deletion
    const { count: totalBefore } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    console.log('Step 3 - Total apps before deletion:', totalBefore)

    // Step 4: Attempt deletion WITHOUT select() first
    console.log('Step 4 - Attempting deletion without select()...')
    const { error: deleteError1 } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId)

    console.log('Step 4 - Delete without select result:', { deleteError1 })

    // Step 5: Check if app still exists
    const { data: checkAfter1, error: checkAfterError1 } = await supabase
      .from('apps')
      .select('id')
      .eq('id', appId)
      .single()

    console.log('Step 5 - Check after deletion without select:', { checkAfter1, checkAfterError1 })

    // Step 6: If still exists, try with select()
    if (!checkAfterError1 && checkAfter1) {
      console.log('Step 6 - App still exists, trying with select()...')
      const { data: deleteData, error: deleteError2 } = await supabase
        .from('apps')
        .delete()
        .eq('id', appId)
        .select()

      console.log('Step 6 - Delete with select result:', { deleteData, deleteError2 })

      // Step 7: Check again
      const { data: checkAfter2, error: checkAfterError2 } = await supabase
        .from('apps')
        .select('id')
        .eq('id', appId)
        .single()

      console.log('Step 7 - Check after deletion with select:', { checkAfter2, checkAfterError2 })
    }

    // Step 8: Get final count
    const { count: totalAfter } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    console.log('Step 8 - Total apps after deletion:', totalAfter)

    // Step 9: Final verification
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('apps')
      .select('id, name')
      .eq('id', appId)
      .single()

    console.log('Step 9 - Final verification:', { finalCheck, finalCheckError })

    return NextResponse.json({
      success: !finalCheck, // true if app was actually deleted
      appId,
      existingApp,
      relatedRecords: {
        screenshots: screenshots?.length || 0,
        ratings: ratings?.length || 0,
        collectionApps: collectionApps?.length || 0,
        customMetadata: customMetadata?.length || 0
      },
      totalBefore,
      totalAfter,
      finalCheck,
      finalCheckError,
      debugSteps: {
        step1: { existingApp, checkError },
        step4: { deleteError1 },
        step5: { checkAfter1, checkAfterError1 },
        step6: { deleteData: 'see console', deleteError2: 'see console' },
        step7: { checkAfter2: 'see console', checkAfterError2: 'see console' },
        step9: { finalCheck, finalCheckError }
      }
    })

  } catch (error) {
    console.error('Debug delete error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    )
  }
} 