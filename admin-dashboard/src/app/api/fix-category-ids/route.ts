import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting category ID fix process...')
    
    // Get all apps that have category_id but the category might be invalid
    const { data: appsToFix, error: fetchError } = await supabase
      .from('apps')
      .select(`
        id, 
        name, 
        category_id,
        categories!inner(id, name, slug)
      `)
      .is('category_id', null)
    
    if (fetchError) {
      console.error('❌ Error fetching apps to fix:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }
    
    console.log(`📊 Found ${appsToFix?.length || 0} apps without category_id`)
    
    // Also get apps with invalid category_id (references non-existent category)
    const { data: appsWithInvalidCategory, error: invalidCategoryError } = await supabase
      .from('apps')
      .select(`
        id, 
        name, 
        category_id
      `)
      .not('category_id', 'is', null)
    
    if (invalidCategoryError) {
      console.error('❌ Error fetching apps with invalid category:', invalidCategoryError)
      return NextResponse.json({ error: 'Failed to fetch apps with invalid category' }, { status: 500 })
    }
    
    // Get all valid category IDs
    const { data: validCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, slug')
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
    
    const validCategoryIds = new Set(validCategories?.map(c => c.id) || [])
    const defaultCategory = validCategories?.find(c => c.slug === 'utilities')
    
    if (!defaultCategory) {
      return NextResponse.json({ error: 'Default category not found' }, { status: 500 })
    }
    
    const results = {
      total: (appsToFix?.length || 0) + (appsWithInvalidCategory?.length || 0),
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Process apps without category_id
    for (const app of appsToFix || []) {
      try {
        console.log(`🔄 Processing app without category_id: ${app.name}`)
        
        // Update the app with the default category_id
        const { error: updateError } = await supabase
          .from('apps')
          .update({ category_id: defaultCategory.id })
          .eq('id', app.id)
        
        if (updateError) {
          console.error(`❌ Failed to update app ${app.name}:`, updateError)
          results.failed++
          results.errors.push(`Failed to update ${app.name}: ${updateError.message}`)
        } else {
          console.log(`✅ Updated app ${app.name} with default category_id: ${defaultCategory.id}`)
          results.updated++
        }
      } catch (error) {
        console.error(`❌ Error processing app ${app.name}:`, error)
        results.failed++
        results.errors.push(`Error processing ${app.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    // Process apps with invalid category_id
    for (const app of appsWithInvalidCategory || []) {
      try {
        if (app.category_id && !validCategoryIds.has(app.category_id)) {
          console.log(`🔄 Processing app with invalid category_id: ${app.name} (category_id: ${app.category_id})`)
          
          // Update the app with the default category_id
          const { error: updateError } = await supabase
            .from('apps')
            .update({ category_id: defaultCategory.id })
            .eq('id', app.id)
          
          if (updateError) {
            console.error(`❌ Failed to update app ${app.name}:`, updateError)
            results.failed++
            results.errors.push(`Failed to update ${app.name}: ${updateError.message}`)
          } else {
            console.log(`✅ Updated app ${app.name} with default category_id: ${defaultCategory.id}`)
            results.updated++
          }
        }
      } catch (error) {
        console.error(`❌ Error processing app ${app.name}:`, error)
        results.failed++
        results.errors.push(`Error processing ${app.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    console.log('✅ Category ID fix process completed')
    console.log('📊 Results:', results)
    
    return NextResponse.json({
      success: true,
      message: `Fixed category IDs for ${results.updated} apps`,
      results
    })
    
  } catch (error) {
    console.error('❌ Error in fix-category-ids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
