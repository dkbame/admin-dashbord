import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { appIds, confirm = false } = await request.json()

    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return NextResponse.json({ 
        error: 'App IDs array is required' 
      }, { status: 400 })
    }

    if (!confirm) {
      return NextResponse.json({ 
        error: 'Confirmation required for bulk delete' 
      }, { status: 400 })
    }

    console.log(`Ultra-fast bulk delete: Starting deletion of ${appIds.length} apps`)

    // Use a single database transaction for ultra-fast bulk delete
    const { data, error } = await supabase
      .from('apps')
      .delete()
      .in('id', appIds)
      .select('id')

    if (error) {
      console.error('Bulk delete error:', error)
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 })
    }

    const deletedCount = data?.length || 0
    console.log(`Ultra-fast bulk delete: Successfully deleted ${deletedCount} apps`)

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedIds: data?.map(app => app.id) || [],
      message: `Successfully deleted ${deletedCount} apps`
    })

  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete apps'
    }, { status: 500 })
  }
}

// GET method for preview (count apps that would be deleted)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appIdsParam = searchParams.get('appIds')
    
    if (!appIdsParam) {
      return NextResponse.json({ 
        error: 'App IDs parameter is required' 
      }, { status: 400 })
    }

    const appIds = appIdsParam.split(',').filter(id => id.trim())

    if (appIds.length === 0) {
      return NextResponse.json({ 
        error: 'No valid app IDs provided' 
      }, { status: 400 })
    }

    // Get app details for preview
    const { data: apps, error } = await supabase
      .from('apps')
      .select('id, name, developer')
      .in('id', appIds)

    if (error) {
      console.error('Bulk delete preview error:', error)
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: apps?.length || 0,
      apps: apps || [],
      message: `Found ${apps?.length || 0} apps to delete`
    })

  } catch (error) {
    console.error('Bulk delete preview error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to preview deletion'
    }, { status: 500 })
  }
} 