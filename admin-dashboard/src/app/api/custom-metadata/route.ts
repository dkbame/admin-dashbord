import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const metadataData = await request.json()
    
    // Validate required fields
    if (!metadataData.app_id) {
      return NextResponse.json(
        { error: 'app_id is required' }, 
        { status: 400 }
      )
    }
    
    // Insert the custom metadata into the database
    const { data: metadata, error } = await supabase
      .from('custom_metadata')
      .insert([metadataData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating custom metadata:', error)
      return NextResponse.json(
        { error: `Failed to create custom metadata: ${error.message}` }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(metadata, { status: 201 })
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
      .from('custom_metadata')
      .select('*')
    
    if (appId) {
      query = query.eq('app_id', appId)
    }
    
    const { data: metadata, error } = await query
    
    if (error) {
      console.error('Error fetching custom metadata:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom metadata' }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(metadata)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 