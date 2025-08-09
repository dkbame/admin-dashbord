import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Category mapping from MacUpdate to our database
const CATEGORY_MAP: { [key: string]: string } = {
  // Productivity
  'productivity': 'productivity',
  'office': 'productivity',
  'word processing': 'productivity',
  'spreadsheets': 'productivity',
  'presentation': 'productivity',
  'project management': 'productivity',
  'ai': 'productivity',
  'artificial intelligence': 'productivity',
  
  // Development
  'development': 'development',
  'developer tools': 'development',
  'Developer Tools': 'development',
  'programming': 'development',
  'coding': 'development',
  'web development': 'development',
  'software development': 'development',
  
  // Graphics & Design
  'graphics': 'graphics-design',
  'graphic design': 'graphics-design',
  'graphic-design': 'graphics-design',
  'design': 'graphics-design',
  'photography': 'graphics-design',
  'image editing': 'graphics-design',
  'photo editing': 'graphics-design',
  'illustration': 'graphics-design',
  'drawing': 'graphics-design',
  '3d': 'graphics-design',
  '3d modeling': 'graphics-design',
  'cad': 'graphics-design',
  'vector': 'graphics-design',
  'typography': 'graphics-design',
  'layout': 'graphics-design',
  'publishing': 'graphics-design',
  
  // Video & Audio
  'video': 'video-audio',
  'audio': 'video-audio',
  'music': 'music-audio',
  'music & audio': 'music-audio',
  'music audio': 'music-audio',
  'video editing': 'video-audio',
  'audio editing': 'video-audio',
  'media': 'video-audio',
  'streaming': 'video-audio',
  'podcast': 'video-audio',
  
  // Utilities
  'utilities': 'utilities',
  'system utilities': 'utilities',
  'internet utilities': 'utilities',
  'browsing': 'utilities',
  'customization': 'utilities',
  'system': 'utilities',
  'maintenance': 'utilities',
  'backup': 'utilities',
  'file management': 'utilities',
  'disk utilities': 'utilities',
  
  // Entertainment
  'entertainment': 'entertainment',
  'media player': 'entertainment',
  'tv': 'entertainment',
  'movies': 'entertainment',
  
  // Games
  'games': 'games',
  'gaming': 'games',
  'game': 'games',
  
  // Business
  'business': 'business',
  'enterprise': 'business',
  'accounting': 'business',
  'crm': 'business',
  
  // Education
  'education': 'education',
  'learning': 'education',
  'tutorial': 'education',
  'training': 'education',
  'academic': 'education',
  
  // Social Networking
  'social': 'social-networking',
  'social networking': 'social-networking',
  'communication': 'social-networking',
  'messaging': 'social-networking',
  'chat': 'social-networking',
  'email': 'social-networking',
  
  // Health & Fitness
  'health': 'health-fitness',
  'fitness': 'health-fitness',
  'health & fitness': 'health-fitness',
  'medical': 'health-fitness',
  'wellness': 'health-fitness',
  'nutrition': 'health-fitness',
  
  // Lifestyle
  'lifestyle': 'lifestyle',
  'personal': 'lifestyle',
  'home': 'lifestyle',
  'family': 'lifestyle',
  
  // Finance
  'finance': 'finance',
  'financial': 'finance',
  'banking': 'finance',
  'investment': 'finance',
  'budgeting': 'finance',
  
  // Reference
  'reference': 'reference',
  'dictionary': 'reference',
  'encyclopedia': 'reference',
  'knowledge': 'reference',
  
  // Sports
  'sports': 'sports',
  'fitness': 'sports',
  'athletics': 'sports',
  'outdoor': 'sports',
}

async function getCategoryId(categoryName: string): Promise<string | null> {
  try {
    console.log('=== CATEGORY MAPPING DEBUG ===')
    console.log('Input category name:', categoryName)
    
    // Map MacUpdate category to our category slug
    const searchTerm = categoryName.toLowerCase().trim()
    console.log('Search term (lowercase):', searchTerm)
    
    let targetSlug = 'utilities' // default fallback
    let matchType = 'default'
    
    // First try exact matches
    if (CATEGORY_MAP[searchTerm]) {
      targetSlug = CATEGORY_MAP[searchTerm]
      matchType = 'exact'
      console.log('✅ Exact match found:', searchTerm, '->', targetSlug)
    } else {
      console.log('❌ No exact match found, trying partial matches...')
      // Try partial matches with better prioritization
      let bestMatch = null
      let bestScore = 0
      
      for (const [key, slug] of Object.entries(CATEGORY_MAP)) {
        // Calculate match score based on how well the terms match
        let score = 0
        
        // Exact substring match gets high score
        if (searchTerm.includes(key) || key.includes(searchTerm)) {
          score = Math.min(searchTerm.length, key.length) / Math.max(searchTerm.length, key.length)
          
          // Bonus for longer matches
          if (searchTerm.includes(key)) {
            score += 0.5
          }
          if (key.includes(searchTerm)) {
            score += 0.3
          }
          
          // Extra bonus for word boundaries
          const words = searchTerm.split(/\s+/)
          const keyWords = key.split(/\s+/)
          for (const word of words) {
            if (keyWords.includes(word)) {
              score += 0.2
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = { key, slug, score }
        }
      }
      
      if (bestMatch && bestScore > 0.3) { // Only use if score is good enough
        targetSlug = bestMatch.slug
        matchType = 'partial'
        console.log('✅ Best partial match found:', searchTerm, '->', bestMatch.key, '->', targetSlug, '(score:', bestScore.toFixed(2), ')')
      } else {
        console.log('❌ No good partial match found, using default')
      }
    }
    
    console.log('Final target slug:', targetSlug, '(match type:', matchType, ')')
    
    // Get category ID from database
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', targetSlug)
      .single()
    
    if (error) {
      console.error('❌ Error fetching category:', error)
      return null
    }
    
    console.log('✅ Category found in database:', categories)
    return categories?.id || null
  } catch (error) {
    console.error('❌ Error in getCategoryId:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting category ID fix process...')
    
    // Get all apps that don't have category_id set but have a category
    const { data: appsToFix, error: fetchError } = await supabase
      .from('apps')
      .select('id, name, category')
      .is('category_id', null)
      .not('category', 'is', null)
      .neq('category', '')
    
    if (fetchError) {
      console.error('❌ Error fetching apps to fix:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }
    
    console.log(`📊 Found ${appsToFix?.length || 0} apps to fix`)
    
    const results = {
      total: appsToFix?.length || 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Process each app
    for (const app of appsToFix || []) {
      try {
        console.log(`🔄 Processing app: ${app.name} (category: ${app.category})`)
        
        // Get category ID
        const categoryId = await getCategoryId(app.category)
        
        if (categoryId) {
          // Update the app with the category ID
          const { error: updateError } = await supabase
            .from('apps')
            .update({ category_id: categoryId })
            .eq('id', app.id)
          
          if (updateError) {
            console.error(`❌ Failed to update app ${app.name}:`, updateError)
            results.failed++
            results.errors.push(`Failed to update ${app.name}: ${updateError.message}`)
          } else {
            console.log(`✅ Updated app ${app.name} with category ID: ${categoryId}`)
            results.updated++
          }
        } else {
          console.log(`⚠️ Could not find category for app ${app.name} (category: ${app.category})`)
          results.failed++
          results.errors.push(`No category mapping found for ${app.name} (category: ${app.category})`)
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
