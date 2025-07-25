import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const screenshotData = await request.json()
    
    // Validate required fields
    if (!screenshotData.app_id || !screenshotData.url) {
      return NextResponse.json(
        { error: 'app_id and url are required' }, 
        { status: 400 }
      )
    }
    
    // Insert the screenshot into the database
    const { data: screenshot, error } = await supabase
      .from('screenshots')
      .insert([screenshotData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating screenshot:', error)
      return NextResponse.json(
        { error: `Failed to create screenshot: ${error.message}` }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(screenshot, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('app_id')
    
    let query = supabase
      .from('screenshots')
      .select('*')
      .order('display_order', { ascending: true })
    
    if (appId) {
      query = query.eq('app_id', appId)
    }
    
    const { data: screenshots, error } = await query
    
    if (error) {
      console.error('Error fetching screenshots:', error)
      return NextResponse.json(
        { error: 'Failed to fetch screenshots' }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(screenshots)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 