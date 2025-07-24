import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')

    if (!appId) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      )
    }

    console.log('Direct delete: Attempting to delete app with ID:', appId)

    // Get count before deletion
    const { count: countBefore } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    console.log('Apps count before deletion:', countBefore)

    // Simple direct delete
    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId)

    if (error) {
      console.error('Direct delete error:', error)
      return NextResponse.json(
        { error: 'Delete failed', details: error },
        { status: 500 }
      )
    }

    // Get count after deletion
    const { count: countAfter } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    console.log('Apps count after deletion:', countAfter)

    const success = (countBefore || 0) > (countAfter || 0)

    return NextResponse.json({
      success,
      countBefore,
      countAfter,
      deleted: (countBefore || 0) - (countAfter || 0)
    })

  } catch (error) {
    console.error('Direct delete error:', error)
    return NextResponse.json(
      { error: 'Delete failed', details: error },
      { status: 500 }
    )
  }
} 