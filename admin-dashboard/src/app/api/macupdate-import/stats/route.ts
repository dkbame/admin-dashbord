import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MacUpdateCategoryScraper } from '@/lib/macupdate-scraper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get basic stats
    const [
      { count: totalApps },
      { count: macUpdateApps },
      { count: recentImports },
      recentSessions
    ] = await Promise.all([
      // Total apps
      supabase
        .from('apps')
        .select('*', { count: 'exact', head: true }),
      
      // MacUpdate apps
      supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'MACUPDATE'),
      
      // Recent imports (last 7 days)
      supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Recent import sessions
      new MacUpdateCategoryScraper().getRecentImportSessions(5)
    ])

    return NextResponse.json({
      totalApps: totalApps || 0,
      macUpdateApps: macUpdateApps || 0,
      recentImports: recentImports || 0,
      recentSessions: recentSessions || []
    })

  } catch (error) {
    console.error('Error getting import stats:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get import stats'
    }, { status: 500 })
  }
} 