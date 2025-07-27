import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all MacUpdate apps with their size information
    const { data: apps, error } = await supabase
      .from('apps')
      .select('id, name, developer, size, source, created_at')
      .eq('source', 'CUSTOM')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }
    
    // Also check the ios_apps_view
    const { data: iosApps, error: iosError } = await supabase
      .from('ios_apps_view')
      .select('id, name, developer, size, source')
      .limit(5)
    
    return NextResponse.json({
      success: true,
      data: {
        macupdate_apps: apps,
        ios_apps_view: iosApps,
        ios_error: iosError?.message
      }
    })
    
  } catch (error) {
    console.error('Error debugging apps:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
} 