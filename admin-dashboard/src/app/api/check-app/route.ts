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

    console.log('Checking if app exists:', appId)

    // Check if app exists
    const { data: app, error } = await supabase
      .from('apps')
      .select('id, name, developer, status')
      .eq('id', appId)
      .single()

    console.log('App check result:', { app, error })

    // Get total app count
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      appExists: !error && app !== null,
      app,
      error: error ? {
        code: error.code,
        message: error.message
      } : null,
      totalApps
    })

  } catch (error) {
    console.error('Check app error:', error)
    return NextResponse.json(
      { error: 'Check failed', details: error },
      { status: 500 }
    )
  }
} 