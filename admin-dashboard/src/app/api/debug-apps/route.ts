import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG APPS CATEGORY DATA ===')
    
    // Check apps table structure
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('id, name, category_id, created_at')
      .limit(5)
    
    if (appsError) {
      console.error('Error fetching apps:', appsError)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }
    
    console.log('Apps with category_id:', apps)
    
    // Check categories table
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .limit(10)
    
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
    
    console.log('Available categories:', categories)
    
    // Check apps with categories relationship
    const { data: appsWithCategories, error: relationshipError } = await supabase
      .from('apps')
      .select(`
        id,
        name,
        category_id,
        categories (
          id,
          name,
          slug
        )
      `)
      .limit(5)
    
    if (relationshipError) {
      console.error('Error fetching apps with categories:', relationshipError)
      return NextResponse.json({ error: 'Failed to fetch apps with categories' }, { status: 500 })
    }
    
    console.log('Apps with categories relationship:', appsWithCategories)
    console.log('=== END DEBUG ===')
    
    return NextResponse.json({
      apps: apps,
      categories: categories,
      appsWithCategories: appsWithCategories
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 