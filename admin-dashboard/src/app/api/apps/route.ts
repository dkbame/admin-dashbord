import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Use the existing supabase client
    const { searchParams } = new URL(request.url);
    
    const categoryId = searchParams.get('category_id');
    const categoryName = searchParams.get('category'); // New: filter by category name
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    console.log('API Request params:', { categoryId, categoryName, search, page, limit, offset });
    
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
      `, { count: 'exact' }) // Get total count for pagination
      .order('created_at', { ascending: false });
    
    // Filter by category ID if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    // Filter by category name if provided
    if (categoryName && categoryName !== 'all') {
      query = query.eq('categories.name', categoryName);
    }
    
    // Search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,developer.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: apps, error, count } = await query;
    
    if (error) {
      console.error('Error fetching apps:', error);
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 });
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    const response = {
      apps,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };
    
    console.log('API Response:', {
      appsCount: apps?.length || 0,
      totalItems: count || 0,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const appData = await request.json();
    
    // Validate required fields
    if (!appData.name) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 });
    }
    
    // Insert the app into the database
    const { data: app, error } = await supabase
      .from('apps')
      .insert([appData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating app:', error);
      return NextResponse.json({ error: `Failed to create app: ${error.message}` }, { status: 500 });
    }
    
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 