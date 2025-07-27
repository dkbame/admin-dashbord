'use client'

import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ImageList,
  ImageListItem,
  Paper
} from '@mui/material'
import { Search, Download, CheckCircle, Error as ErrorIcon } from '@mui/icons-material'

interface MacUpdateApp {
  name: string
  developer: string
  description: string
  category: string
  price: string
  rating: number
  reviewCount: number
  version: string
  macUpdateUrl: string
  lastUpdated: string
  fileSize: string
  requirements: string
  website: string
  screenshots: string[]
  iconUrl: string
}

interface ImportResult {
  success: boolean
  appId?: string
  error?: string
  screenshots?: number
  metadata?: boolean
}

export default function SingleAppImportPage() {
  const [url, setUrl] = useState('')
  const [isScrapingLoading, setIsScrapingLoading] = useState(false)
  const [isImportLoading, setIsImportLoading] = useState(false)
  const [scrapedApp, setScrapedApp] = useState<MacUpdateApp | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleScrapeApp = async () => {
    if (!url.trim()) {
      setError('Please enter a MacUpdate URL')
      return
    }

    setIsScrapingLoading(true)
    setError('')
    setSuccess('')
    setScrapedApp(null)

    try {
      const response = await fetch('/api/macupdate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (data.success && data.app) {
        setScrapedApp(data.app)
        setSuccess(`Successfully scraped: ${data.app.name}`)
      } else {
        setError(data.error || 'Failed to scrape app data')
      }
    } catch (err) {
      setError('Network error while scraping app')
      console.error('Scraping error:', err)
    } finally {
      setIsScrapingLoading(false)
    }
  }

  const handleImportApp = async () => {
    if (!scrapedApp) return

    setIsImportLoading(true)
    setError('')
    setImportResult(null)

    try {
      // Get iTunes Store data
      console.log(`Looking up iTunes Store data for: ${scrapedApp.name}`)
      const itunesResponse = await fetch(`/api/itunes/search?term=${encodeURIComponent(scrapedApp.name)}&entity=macSoftware&limit=1`)
      const itunesData = await itunesResponse.json()
      const itunesApp = itunesData.results && itunesData.results.length > 0 ? itunesData.results[0] : null
      const isAppStore = !!itunesApp

      console.log(`iTunes Store lookup result: ${isAppStore ? 'Found' : 'Not found'}`)

      // Get category ID
      const categoryId = await getCategoryId(scrapedApp.category)

      // Build comprehensive app data
      const appData = {
        name: scrapedApp.name,
        developer: scrapedApp.developer,
        description: scrapedApp.description,
        category_id: categoryId,
        price: parseFloat(scrapedApp.price.replace(/[^0-9.]/g, '')) || 0,
        currency: 'USD',
        rating: scrapedApp.rating || 0,
        rating_count: scrapedApp.reviewCount || 0,
        version: scrapedApp.version,
        is_on_mas: isAppStore,
        mas_id: itunesApp?.trackId?.toString() || null,
        mas_url: itunesApp?.trackViewUrl || null,
        app_store_url: itunesApp?.trackViewUrl || null,
        website_url: scrapedApp.website || scrapedApp.macUpdateUrl,
        download_url: itunesApp?.trackViewUrl || scrapedApp.macUpdateUrl,
        icon_url: itunesApp?.artworkUrl512 || itunesApp?.artworkUrl100 || scrapedApp.iconUrl || null,
        minimum_os_version: itunesApp?.minimumOsVersion || scrapedApp.requirements,
        size: itunesApp?.fileSizeBytes || null,
        release_date: itunesApp?.releaseDate || null,
        is_free: scrapedApp.price === 'Free' || scrapedApp.price === '$0.00',
        is_featured: false,
        features: itunesApp?.genres || [],
        source: isAppStore ? 'MAS' : 'CUSTOM',
        status: 'ACTIVE'
      }

      // Save the main app record
      const saveResponse = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      })

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text()
        throw new Error(`Failed to save app: ${errorText}`)
      }

      const savedApp = await saveResponse.json()
      console.log(`✅ Saved app: ${savedApp.name} (ID: ${savedApp.id})`)

      let screenshotsCount = 0
      let metadataSaved = false

      // Save screenshots
      const screenshotsToSave = isAppStore ? 
        (itunesApp?.screenshotUrls || []) : 
        scrapedApp.screenshots
      
      if (screenshotsToSave && screenshotsToSave.length > 0) {
        for (let idx = 0; idx < screenshotsToSave.length; idx++) {
          try {
            const screenshotData = {
              app_id: savedApp.id,
              url: screenshotsToSave[idx],
              display_order: idx + 1,
              caption: `${scrapedApp.name} Screenshot ${idx + 1}`
            }
            
            const screenshotResponse = await fetch('/api/screenshots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(screenshotData)
            })
            
            if (screenshotResponse.ok) {
              screenshotsCount++
            }
          } catch (screenshotError) {
            console.error(`Failed to save screenshot ${idx + 1}:`, screenshotError)
          }
        }
      }

      // Save metadata
      if (scrapedApp.requirements || itunesApp?.releaseNotes) {
        try {
          const metadataData = {
            app_id: savedApp.id,
            release_notes: itunesApp?.releaseNotes || '',
            system_requirements: [scrapedApp.requirements || 'macOS'],
            license: scrapedApp.fileSize ? `File Size: ${scrapedApp.fileSize}` : ''
          }
          
          const metadataResponse = await fetch('/api/custom-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metadataData)
          })
          
          metadataSaved = metadataResponse.ok
        } catch (metadataError) {
          console.error('Failed to save metadata:', metadataError)
        }
      }

      setImportResult({
        success: true,
        appId: savedApp.id,
        screenshots: screenshotsCount,
        metadata: metadataSaved
      })

      setSuccess(`Successfully imported ${scrapedApp.name}!`)

    } catch (err) {
      console.error('Import error:', err)
      setImportResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
      setError('Failed to import app to database')
    } finally {
      setIsImportLoading(false)
    }
  }

  const handleDebugApp = async () => {
    if (!url.trim()) {
      setError('Please enter a MacUpdate URL')
      return
    }

    setIsScrapingLoading(true)
    setError('')
    setDebugInfo(null)

    try {
      const response = await fetch('/api/macupdate-debug-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (data.success) {
        setDebugInfo(data.debugInfo)
        setSuccess(`Debug info retrieved for: ${data.url}`)
      } else {
        setError(data.error || 'Failed to get debug info')
      }
    } catch (err) {
      setError('Network error while getting debug info')
      console.error('Debug error:', err)
    } finally {
      setIsScrapingLoading(false)
    }
  }

  const getCategoryId = async (categoryName: string): Promise<string | null> => {
    const categoryMap: { [key: string]: string } = {
      'productivity': 'productivity',
      'development': 'development', 
      'design': 'design',
      'utilities': 'utilities',
      'entertainment': 'entertainment',
      'education': 'education',
      'business': 'business',
      'graphics': 'graphics-design',
      'video': 'video-audio',
      'audio': 'video-audio',
      'social': 'social-networking',
      'games': 'games',
      'health': 'health-fitness',
      'lifestyle': 'lifestyle',
      'finance': 'finance',
      'reference': 'reference'
    }
    
    const searchTerm = categoryName.toLowerCase()
    for (const [key, slug] of Object.entries(categoryMap)) {
      if (searchTerm.includes(key)) {
        try {
          const response = await fetch('/api/categories')
          const categories = await response.json()
          const category = categories.find((c: any) => c.slug === slug)
          return category?.id || null
        } catch (error) {
          console.error('Error fetching categories:', error)
          return null
        }
      }
    }
    return null
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Import Single App from MacUpdate
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Enter a MacUpdate app URL to scrape and import a single app with all its details.
      </Typography>

      {/* URL Input Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="MacUpdate App URL"
                placeholder="https://vlc-media-player.macupdate.com/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isScrapingLoading}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleScrapeApp}
                disabled={isScrapingLoading || !url.trim()}
                startIcon={isScrapingLoading ? <CircularProgress size={20} /> : <Search />}
              >
                {isScrapingLoading ? 'Scraping...' : 'Scrape App'}
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={handleDebugApp}
                disabled={isScrapingLoading || !url.trim()}
                startIcon={isScrapingLoading ? <CircularProgress size={20} /> : <Search />}
              >
                {isScrapingLoading ? 'Loading...' : 'Debug HTML'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Debug Info Display */}
      {debugInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Debug Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">HTML Length:</Typography>
                <Typography variant="body2" color="text.secondary">{debugInfo.htmlLength} characters</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Page Title:</Typography>
                <Typography variant="body2" color="text.secondary">{debugInfo.title}</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Element Counts:</Typography>
                <Typography variant="body2" color="text.secondary">
                  H1 elements: {debugInfo.searchResults.h1Count}<br/>
                  main_data divs: {debugInfo.searchResults.mainDataCount}<br/>
                  galleries: {debugInfo.searchResults.galleryCount}<br/>
                  logos: {debugInfo.searchResults.logoCount}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                {debugInfo.h1Elements.length > 0 && (
                  <>
                    <Typography variant="subtitle2">H1 Elements Found:</Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      {debugInfo.h1Elements.map((h1: string, index: number) => (
                        <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mb: 1 }}>
                          {h1}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
                
                {debugInfo.logoImg && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Logo Element:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                      {debugInfo.logoImg}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Sample HTML (first 2000 chars):</Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {debugInfo.sampleHtml}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* App Preview */}
      {scrapedApp && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {/* App Header with Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {scrapedApp.iconUrl && (
                    <Avatar
                      src={scrapedApp.iconUrl}
                      alt={`${scrapedApp.name} icon`}
                      sx={{ 
                        width: 64, 
                        height: 64, 
                        mr: 2,
                        borderRadius: 2,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    />
                  )}
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      {scrapedApp.name}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      by {scrapedApp.developer}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Chip label={scrapedApp.category} sx={{ mr: 1 }} />
                  <Chip label={scrapedApp.price} color="primary" sx={{ mr: 1 }} />
                  <Chip label={`v${scrapedApp.version}`} variant="outlined" />
                </Box>

                <Typography variant="body2" paragraph>
                  {scrapedApp.description}
                </Typography>

                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Rating" 
                      secondary={`${scrapedApp.rating}/5.0 (${scrapedApp.reviewCount} reviews)`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="File Size" 
                      secondary={scrapedApp.fileSize} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Requirements" 
                      secondary={scrapedApp.requirements} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Last Updated" 
                      secondary={scrapedApp.lastUpdated} 
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={4}>
                {scrapedApp.screenshots.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Screenshots ({scrapedApp.screenshots.length})
                    </Typography>
                    <ImageList cols={1} gap={8}>
                      {scrapedApp.screenshots.slice(0, 3).map((screenshot, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={screenshot}
                            alt={`${scrapedApp.name} screenshot ${index + 1}`}
                            loading="lazy"
                            style={{ 
                              width: '100%', 
                              height: 'auto',
                              maxHeight: '200px',
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </Grid>
            </Grid>

            {/* Import Button */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleImportApp}
                disabled={isImportLoading}
                startIcon={isImportLoading ? <CircularProgress size={20} /> : <Download />}
              >
                {isImportLoading ? 'Importing...' : 'Import to Database'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardContent>
            {importResult.success ? (
              <Box textAlign="center">
                <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Import Successful!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  App ID: {importResult.appId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Screenshots saved: {importResult.screenshots}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Metadata saved: {importResult.metadata ? 'Yes' : 'No'}
                </Typography>
              </Box>
            ) : (
              <Box textAlign="center">
                <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Import Failed
                </Typography>
                <Typography variant="body2" color="error">
                  {importResult.error}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
} 