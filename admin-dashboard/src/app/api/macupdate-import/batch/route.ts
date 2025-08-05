import { NextRequest, NextResponse } from 'next/server'
import { importMacUpdateAppsBatch } from '@/lib/macupdate-db'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 25000 // 25 seconds (leave 5 seconds buffer for Netlify)
  
  try {
    const body = await request.json()
    const { apps, categoryUrl } = body

    console.log(`📥 Batch import request received:`)
    console.log(`   - apps count: ${apps?.length || 0}`)
    console.log(`   - categoryUrl: "${categoryUrl}"`)
    console.log(`   - categoryUrl type: ${typeof categoryUrl}`)
    console.log(`   - categoryUrl undefined: ${categoryUrl === undefined}`)
    console.log(`   - categoryUrl null: ${categoryUrl === null}`)
    console.log(`   - categoryUrl empty: ${categoryUrl === ''}`)
    console.log(`   - categoryUrl is "undefined" string: ${categoryUrl === "undefined"}`)

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No apps provided for import' },
        { status: 400 }
      )
    }

    // Handle the case where categoryUrl is the string "undefined"
    let actualCategoryUrl = categoryUrl
    if (categoryUrl === "undefined" || categoryUrl === undefined || categoryUrl === null || categoryUrl === "") {
      console.log(`⚠️ categoryUrl is invalid, attempting to extract from apps...`)
      
      // Try to extract category URL from the apps being imported
      if (apps.length > 0) {
        // Look for the most common category among the apps
        const categoryCounts: { [key: string]: number } = {}
        
        apps.forEach(app => {
          if (app.category) {
            const category = app.category.trim()
            categoryCounts[category] = (categoryCounts[category] || 0) + 1
          }
        })
        
        // Find the most common category
        let mostCommonCategory = null
        let maxCount = 0
        for (const [category, count] of Object.entries(categoryCounts)) {
          if (count > maxCount) {
            mostCommonCategory = category
            maxCount = count
          }
        }
        
        if (mostCommonCategory) {
          console.log(`🔍 Most common category from apps: ${mostCommonCategory} (${maxCount} apps)`)
          
          // Map category names to URLs
          const categoryUrlMap: { [key: string]: string } = {
            'Music & Audio': 'https://www.macupdate.com/explore/categories/music-audio',
            'Music Audio': 'https://www.macupdate.com/explore/categories/music-audio',
            'System Utilities': 'https://www.macupdate.com/explore/categories/system-utilities',
            'Utilities': 'https://www.macupdate.com/explore/categories/system-utilities',
            'Video & Audio': 'https://www.macupdate.com/explore/categories/video-audio',
            'Photography': 'https://www.macupdate.com/explore/categories/photography',
            'Productivity': 'https://www.macupdate.com/explore/categories/productivity',
            'Development': 'https://www.macupdate.com/explore/categories/development',
            'Games': 'https://www.macupdate.com/explore/categories/games',
            'Education': 'https://www.macupdate.com/explore/categories/education'
          }
          
          actualCategoryUrl = categoryUrlMap[mostCommonCategory] || "https://www.macupdate.com/explore/categories/system-utilities"
          console.log(`🔧 Using extracted category URL: ${actualCategoryUrl}`)
        } else {
          console.log(`❌ No category found in apps, using default fallback`)
          actualCategoryUrl = "https://www.macupdate.com/explore/categories/system-utilities"
          console.log(`🔧 Using default fallback category URL: ${actualCategoryUrl}`)
        }
      } else {
        console.log(`❌ No apps found, using default fallback`)
        actualCategoryUrl = "https://www.macupdate.com/explore/categories/system-utilities"
        console.log(`🔧 Using default fallback category URL: ${actualCategoryUrl}`)
      }
    }

    console.log(`Starting batch import of ${apps.length} apps${actualCategoryUrl ? ` for category: ${actualCategoryUrl}` : ''}`)

    // Check execution time periodically
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Request timeout - batch import taking too long')
      }
    }

    // Import apps in batch
    const result = await importMacUpdateAppsBatch(apps)
    
    checkTimeout()

    // Session updates are now handled in the frontend before batch import
    // to avoid categoryUrl mismatch issues
    console.log(`Batch import completed: ${result.successful} successful, ${result.failed} failed`)

    const executionTime = Date.now() - startTime
    console.log(`Batch import completed in ${executionTime}ms: ${result.successful} successful, ${result.failed} failed`)

    return NextResponse.json({
      success: true,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
      executionTime
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('MacUpdate import error:', error, `(execution time: ${executionTime}ms)`)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime
      },
      { status: 500 }
    )
  }
} 