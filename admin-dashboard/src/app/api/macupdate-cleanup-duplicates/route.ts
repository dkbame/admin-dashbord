import { NextRequest, NextResponse } from 'next/server'
import { findDuplicateApps, removeDuplicateApps } from '@/lib/macupdate-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'find') {
      // Find duplicates
      const duplicates = await findDuplicateApps()
      
      return NextResponse.json({
        success: true,
        data: duplicates
      })
    } else if (action === 'remove') {
      // Remove duplicates
      const result = await removeDuplicateApps()
      
      return NextResponse.json({
        success: true,
        data: result
      })
    } else {
      // Default: just find duplicates
      const duplicates = await findDuplicateApps()
      
      return NextResponse.json({
        success: true,
        data: duplicates
      })
    }
  } catch (error) {
    console.error('Error in cleanup duplicates API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
} 