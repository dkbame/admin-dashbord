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
        
        if (mostCommonCategory && mostCommonCategory !== 'Unknown') {
          console.log(`🔍 Most common category from apps: ${mostCommonCategory} (${maxCount} apps)`)
          
          // Map category names to URLs
          const categoryUrlMap: { [key: string]: string } = {
            // Main categories
            'Music & Audio': 'https://www.macupdate.com/explore/categories/music-audio',
            'Music Audio': 'https://www.macupdate.com/explore/categories/music-audio',
            'System Utilities': 'https://www.macupdate.com/explore/categories/system-utilities',
            'Utilities': 'https://www.macupdate.com/explore/categories/system-utilities',
            'Video & Audio': 'https://www.macupdate.com/explore/categories/video-audio',
            'Photography': 'https://www.macupdate.com/explore/categories/photography',
            'Productivity': 'https://www.macupdate.com/explore/categories/productivity',
            'Development': 'https://www.macupdate.com/explore/categories/development',
            'Games': 'https://www.macupdate.com/explore/categories/games',
            'Education': 'https://www.macupdate.com/explore/categories/education',
            'Video': 'https://www.macupdate.com/explore/categories/video',
            'Business': 'https://www.macupdate.com/explore/categories/business',
            'Customization': 'https://www.macupdate.com/explore/categories/customization',
            'Developer Tools': 'https://www.macupdate.com/explore/categories/developer-tools',
            'Finance': 'https://www.macupdate.com/explore/categories/finance',
            'Graphic Design': 'https://www.macupdate.com/explore/categories/graphic-design',
            'Health & Fitness': 'https://www.macupdate.com/explore/categories/health-fitness',
            'Internet Utilities': 'https://www.macupdate.com/explore/categories/internet-utilities',
            'Lifestyle & Hobby': 'https://www.macupdate.com/explore/categories/lifestyle-hobby',
            'Medical Software': 'https://www.macupdate.com/explore/categories/medical-software',
            'Security': 'https://www.macupdate.com/explore/categories/security',
            'Travel': 'https://www.macupdate.com/explore/categories/travel',
            
            // Video subcategories
            'DVD Software': 'https://www.macupdate.com/explore/categories/video/dvd-software',
            'Video Converters': 'https://www.macupdate.com/explore/categories/video/video-converters',
            'Video Editors': 'https://www.macupdate.com/explore/categories/video/video-editors',
            'Video Players': 'https://www.macupdate.com/explore/categories/video/video-players',
            'Video Recording': 'https://www.macupdate.com/explore/categories/video/video-recording',
            'Video Streaming': 'https://www.macupdate.com/explore/categories/video/video-streaming',
            
            // Music & Audio subcategories
            'Audio Converters': 'https://www.macupdate.com/explore/categories/music-audio/audio-converters',
            'Audio Players': 'https://www.macupdate.com/explore/categories/music-audio/audio-players',
            'Audio Plug-ins': 'https://www.macupdate.com/explore/categories/music-audio/audio-plug-ins',
            'Audio Production': 'https://www.macupdate.com/explore/categories/music-audio/audio-production',
            'Audio Recording': 'https://www.macupdate.com/explore/categories/music-audio/audio-recording',
            'Audio Streaming': 'https://www.macupdate.com/explore/categories/music-audio/audio-streaming',
            'DJ Mixing Software': 'https://www.macupdate.com/explore/categories/music-audio/dj-mixing-software',
            'Music Management': 'https://www.macupdate.com/explore/categories/music-audio/music-management',
            'Radio': 'https://www.macupdate.com/explore/categories/music-audio/radio',
            
            // System Utilities subcategories
            'Automation': 'https://www.macupdate.com/explore/categories/system-utilities/automation',
            'Backup': 'https://www.macupdate.com/explore/categories/system-utilities/backup',
            'Cleaners': 'https://www.macupdate.com/explore/categories/system-utilities/cleaners',
            'Clocks & Alarms': 'https://www.macupdate.com/explore/categories/system-utilities/clocks-alarms',
            'Compression': 'https://www.macupdate.com/explore/categories/system-utilities/compression',
            'Contextual Menus': 'https://www.macupdate.com/explore/categories/system-utilities/contextual-menus',
            'Diagnostic Software': 'https://www.macupdate.com/explore/categories/system-utilities/diagnostic-software',
            'Disk Utilities': 'https://www.macupdate.com/explore/categories/system-utilities/disk-utilities',
            'Emulation': 'https://www.macupdate.com/explore/categories/system-utilities/emulation',
            'File Management': 'https://www.macupdate.com/explore/categories/system-utilities/file-management',
            'Font Managers': 'https://www.macupdate.com/explore/categories/system-utilities/font-managers',
            'Maintenance & Optimization': 'https://www.macupdate.com/explore/categories/system-utilities/maintenance-optimization',
            'Network Software': 'https://www.macupdate.com/explore/categories/system-utilities/network-software',
            'Printer & Scanner Drivers': 'https://www.macupdate.com/explore/categories/system-utilities/printer-scanner-drivers',
            'Recovery': 'https://www.macupdate.com/explore/categories/system-utilities/recovery',
            'Synchronization': 'https://www.macupdate.com/explore/categories/system-utilities/synchronization',
            'USB Drivers': 'https://www.macupdate.com/explore/categories/system-utilities/usb-drivers',
            'Virtualization': 'https://www.macupdate.com/explore/categories/system-utilities/virtualization'
          }
          
          actualCategoryUrl = categoryUrlMap[mostCommonCategory] || "https://www.macupdate.com/explore/categories/system-utilities"
          console.log(`🔧 Using extracted category URL: ${actualCategoryUrl}`)
        } else {
          console.log(`❌ No valid category found in apps (found: ${mostCommonCategory}), using default fallback`)
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

    // Update import sessions if categoryUrl is provided
    if (actualCategoryUrl && result.successful > 0) {
      try {
        console.log(`Attempting to update import sessions for category: ${actualCategoryUrl}`)
        
        // Find the most recent import session for this category
        const { data: sessions, error: sessionsError } = await supabase
          .from('import_sessions')
          .select('*')
          .eq('category_url', actualCategoryUrl)
          .like('session_name', '%Page %')
          .order('created_at', { ascending: false })
          .limit(1)

        if (sessionsError) {
          console.error('Error finding import sessions:', sessionsError)
        } else if (sessions && sessions.length > 0) {
          const latestSession = sessions[0]
          console.log(`Found import session: ${latestSession.id}, current status: ${latestSession.page_status}`)
          
          // Update the session with actual import results
          const { error: updateError } = await supabase
            .from('import_sessions')
            .update({
              page_status: 'imported',
              apps_imported: result.successful,
              apps_skipped: result.failed,
              completed_at: new Date().toISOString()
            })
            .eq('id', latestSession.id)

          if (updateError) {
            console.error('Error updating import session:', updateError)
          } else {
            console.log(`Successfully updated import session ${latestSession.id} with ${result.successful} imported apps, status: imported`)
          }
        } else {
          console.log('No import sessions found for category:', actualCategoryUrl)
        }
      } catch (sessionError) {
        console.error('Error updating import sessions:', sessionError)
        // Don't fail the entire import if session update fails
      }
    } else {
      console.log(`Skipping import session update - categoryUrl: ${actualCategoryUrl}, successful imports: ${result.successful}`)
    }

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