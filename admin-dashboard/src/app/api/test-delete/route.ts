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

    console.log('Testing delete for app ID:', appId)

    // Check if app exists
    const { data: existingApp, error: checkError } = await supabase
      .from('apps')
      .select('id, name, developer, status')
      .eq('id', appId)
      .single()

    console.log('App exists check:', { existingApp, checkError })

    if (checkError || !existingApp) {
      return NextResponse.json(
        { error: 'App not found', checkError },
        { status: 404 }
      )
    }

    // Check for related records that might prevent deletion
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('id')
      .eq('app_id', appId)

    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('id')
      .eq('app_id', appId)

    const { data: collectionApps, error: collectionAppsError } = await supabase
      .from('collection_apps')
      .select('id')
      .eq('app_id', appId)

    const { data: customMetadata, error: customMetadataError } = await supabase
      .from('custom_metadata')
      .select('id')
      .eq('app_id', appId)

    console.log('Related records check:', {
      screenshots: screenshots?.length || 0,
      ratings: ratings?.length || 0,
      collectionApps: collectionApps?.length || 0,
      customMetadata: customMetadata?.length || 0
    })

    // Attempt deletion
    const { data, error } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId)
      .select()

    console.log('Delete result:', { data, error })

    if (error) {
      return NextResponse.json(
        { 
          error: 'Delete failed', 
          details: error,
          errorCode: error.code,
          errorMessage: error.message
        },
        { status: 500 }
      )
    }

    // Verify deletion
    const { data: verifyApp, error: verifyError } = await supabase
      .from('apps')
      .select('id, name')
      .eq('id', appId)
      .single()

    console.log('Verification:', { verifyApp, verifyError })

    // Get total app count before and after
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: !verifyApp, // true if app was actually deleted
      deletedApp: existingApp,
      deleteResult: data,
      verification: { verifyApp, verifyError },
      relatedRecords: {
        screenshots: screenshots?.length || 0,
        ratings: ratings?.length || 0,
        collectionApps: collectionApps?.length || 0,
        customMetadata: customMetadata?.length || 0
      },
      totalApps,
      errorDetails: error ? {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details
      } : null
    })

  } catch (error) {
    console.error('Test delete error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    )
  }
} 