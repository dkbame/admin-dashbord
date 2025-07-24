import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Use the existing supabase client
    const { searchParams } = new URL(request.url);
    
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    
    let query = supabase
      .from('apps')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          icon,
          color
        )
      `)
      .order('created_at', { ascending: false });
    
    // Filter by category if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    // Search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,developer.ilike.%${search}%`);
    }
    
    const { data: apps, error } = await query;
    
    if (error) {
      console.error('Error fetching apps:', error);
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 });
    }
    
    return NextResponse.json(apps);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 