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
      .select('id, name')
      .eq('id', appId)
      .single()

    console.log('App exists check:', { existingApp, checkError })

    if (checkError || !existingApp) {
      return NextResponse.json(
        { error: 'App not found', checkError },
        { status: 404 }
      )
    }

    // Attempt deletion
    const { data, error } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId)
      .select()

    console.log('Delete result:', { data, error })

    if (error) {
      return NextResponse.json(
        { error: 'Delete failed', details: error },
        { status: 500 }
      )
    }

    // Verify deletion
    const { data: verifyApp, error: verifyError } = await supabase
      .from('apps')
      .select('id')
      .eq('id', appId)
      .single()

    console.log('Verification:', { verifyApp, verifyError })

    return NextResponse.json({
      success: true,
      deletedApp: existingApp,
      deleteResult: data,
      verification: { verifyApp, verifyError }
    })

  } catch (error) {
    console.error('Test delete error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    )
  }
} 