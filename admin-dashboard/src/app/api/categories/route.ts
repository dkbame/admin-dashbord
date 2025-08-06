import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching categories for filter dropdown...')
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, icon, color')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
    
    console.log(`Found ${categories?.length || 0} categories`)
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 