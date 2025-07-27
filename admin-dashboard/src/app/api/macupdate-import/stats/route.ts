import { NextResponse } from 'next/server'
import { getImportStats } from '@/lib/macupdate-db'

export async function GET() {
  try {
    const stats = await getImportStats()
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error getting import stats:', error)
    
    return NextResponse.json(
      { 
        totalApps: 0,
        macUpdateApps: 0,
        recentImports: 0
      },
      { status: 500 }
    )
  }
} 