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
              // Get or create category
              let categoryId = null
              if (appPreview.category) {
                // Try to find existing category
                const { data: existingCategory } = await supabase
                  .from('categories')
                  .select('id')
                  .eq('name', appPreview.category)
                  .single()
                
                if (existingCategory) {
                  categoryId = existingCategory.id
                } else {
                  // Create new category
                  const { data: newCategory, error: categoryError } = await supabase
                    .from('categories')
                    .insert([{
                      name: appPreview.category,
                      slug: appPreview.category.toLowerCase().replace(/\s+/g, '-')
                    }])
                    .select()
                    .single()
                  
                  if (newCategory && !categoryError) {
                    categoryId = newCategory.id
                  }
                }
              }
              
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
                  description: appPreview.description || '',
                  category_id: categoryId,
                  icon_url: appPreview.icon_url || '',
                  macupdate_url: appUrl,
                  website_url: appPreview.developer_website_url || null,
                  release_date: appPreview.release_date || null,
                  last_updated: appPreview.last_updated || new Date(),
                  size: appPreview.file_size ? parseInt(appPreview.file_size) : null,
                  architecture: appPreview.architecture || null,
                  source: 'MACUPDATE',
                  status: 'ACTIVE'
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

export async function PUT(request: NextRequest) {
  try {
    const { categoryUrl, pageNumber, appsImported, appsSkipped, status } = await request.json()

    if (!categoryUrl || !pageNumber) {
      return NextResponse.json({ 
        error: 'Category URL and page number are required' 
      }, { status: 400 })
    }

    console.log(`Updating import session status for category: ${categoryUrl}, page: ${pageNumber}`)

    // Find the import session for this category and page
    const { data: sessions, error: sessionsError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('category_url', categoryUrl)
      .like('session_name', `%Page ${pageNumber}`)
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionsError) {
      console.error('Error finding import sessions:', sessionsError)
      return NextResponse.json({
        error: `Database error: ${sessionsError.message}`
      }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        error: 'Import session not found'
      }, { status: 404 })
    }

    const session = sessions[0]
    
    // Update the session with the provided status and counts
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        page_status: status || 'imported',
        apps_imported: appsImported || 0,
        apps_skipped: appsSkipped || 0,
        completed_at: new Date().toISOString()
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating import session:', updateError)
      return NextResponse.json({
        error: `Failed to update session: ${updateError.message}`
      }, { status: 500 })
    }

    console.log(`Successfully updated import session ${session.id} with status: ${status}, apps imported: ${appsImported}`)

    return NextResponse.json({
      success: true,
      message: `Import session updated successfully`,
      data: {
        sessionId: session.id,
        pageNumber,
        status: status || 'imported',
        appsImported: appsImported || 0
      }
    })

  } catch (error) {
    console.error('Category import page status update error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update import session status'
    }, { status: 500 })
  }
} 