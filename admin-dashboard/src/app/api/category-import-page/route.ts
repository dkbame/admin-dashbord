import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, pageNumber } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 })
    }

    const targetPageNumber = pageNumber || 1
    console.log(`Importing apps from session: ${sessionId}, page: ${targetPageNumber}`)

    // Get the import session
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Error getting session:', sessionError)
      return NextResponse.json({
        error: `Session not found: ${sessionError.message}`
      }, { status: 404 })
    }

    if (!session) {
      return NextResponse.json({
        error: 'Session not found'
      }, { status: 404 })
    }

    // Check if already imported
    if (session.page_status === 'imported') {
      return NextResponse.json({
        success: true,
        message: 'Page already imported',
        data: {
          sessionId,
          pageNumber: targetPageNumber,
          status: 'already_imported',
          appsImported: session.apps_imported || 0
        }
      })
    }

    // Get the category URL from session
    const categoryUrl = session.category_url
    
    console.log(`Starting actual import for category: ${categoryUrl}, page: ${targetPageNumber}`)
    
    // Import the apps from this page using the existing scraper
    const { MacUpdateCategoryScraper } = await import('@/lib/macupdate-scraper')
    const scraper = new MacUpdateCategoryScraper()
    
    try {
      // Scrape the specific page to get app URLs
      const result = await scraper.getAppsUrlsOnly(categoryUrl, 20, 1)
      
      if (result.appUrls.length === 0) {
        throw new Error('No apps found on this page')
      }
      
      console.log(`Found ${result.appUrls.length} apps to import from page ${targetPageNumber}`)
      
      // Import each app
      let importedCount = 0
      let skippedCount = 0
      
      for (const appUrl of result.appUrls) {
        try {
          // Get app preview data
          const appPreview = await scraper.getAppPreview(appUrl)
          
          if (appPreview) {
            // Check if app already exists
            const { data: existingApp } = await supabase
              .from('apps')
              .select('id')
              .eq('macupdate_url', appUrl)
              .single()
            
            if (!existingApp) {
              // Insert the app
              const { error: insertError } = await supabase
                .from('apps')
                .insert([{
                  name: appPreview.name || 'Unknown App',
                  developer: appPreview.developer || 'Unknown Developer',
                  version: appPreview.version || 'Unknown',
                  price: appPreview.price || 0,
                  currency: appPreview.currency || 'USD',
                  rating: appPreview.rating || null,
                  rating_count: appPreview.rating_count || 0,
                  download_count: appPreview.download_count || 0,
                  description: appPreview.description || '',
                  category: appPreview.category || 'Unknown',
                  system_requirements: appPreview.system_requirements || [],
                  screenshots: appPreview.screenshots || [],
                  icon_url: appPreview.icon_url || '',
                  macupdate_url: appUrl,
                  developer_website_url: appPreview.developer_website_url || null,
                  release_date: appPreview.release_date || null,
                  last_updated: appPreview.last_updated || new Date(),
                  file_size: appPreview.file_size || null,
                  requirements: appPreview.requirements || null,
                  architecture: appPreview.architecture || null
                }])
              
              if (insertError) {
                console.error(`Error inserting app ${appUrl}:`, insertError)
                skippedCount++
              } else {
                importedCount++
              }
            } else {
              skippedCount++
            }
          } else {
            skippedCount++
          }
        } catch (appError) {
          console.error(`Error processing app ${appUrl}:`, appError)
          skippedCount++
        }
      }
      
      // Update the session with actual import results
      const { error: updateError } = await supabase
        .from('import_sessions')
        .update({
          page_status: 'imported',
          apps_imported: importedCount,
          apps_skipped: skippedCount,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error updating session:', updateError)
        return NextResponse.json({
          error: `Failed to update session: ${updateError.message}`
        }, { status: 500 })
      }

      console.log(`Successfully imported ${importedCount} apps from page ${targetPageNumber}`)

      return NextResponse.json({
        success: true,
        message: `Page ${targetPageNumber} imported successfully: ${importedCount} apps imported, ${skippedCount} skipped`,
        data: {
          sessionId,
          pageNumber: targetPageNumber,
          status: 'imported',
          appsImported: importedCount
        }
      })
      
    } catch (scraperError) {
      console.error('Error during import process:', scraperError)
      return NextResponse.json({
        error: `Import failed: ${scraperError instanceof Error ? scraperError.message : 'Unknown error'}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Category import page error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import page'
    }, { status: 500 })
  }
} 