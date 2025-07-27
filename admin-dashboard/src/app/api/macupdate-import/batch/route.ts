import { NextRequest, NextResponse } from 'next/server'
import { importMacUpdateAppsBatch } from '@/lib/macupdate-db'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apps } = body

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No apps provided for import' },
        { status: 400 }
      )
    }

    // Import apps in batch
    const result = await importMacUpdateAppsBatch(apps)

    return NextResponse.json({
      success: true,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results
    })

  } catch (error) {
    console.error('MacUpdate import error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 