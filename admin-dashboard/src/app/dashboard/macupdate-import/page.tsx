'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material'
import {
  CloudDownload,
  ExpandMore,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  PlayArrow,
  Stop,
  Refresh
} from '@mui/icons-material'

interface MacUpdateApp {
  name: string
  rating: number
  reviewCount: number
  price: string
  category: string
  description: string
  version: string
  macUpdateUrl: string
  lastUpdated?: string
  developer?: string
}

interface ImportResult {
  name: string
  developer: string
  status: 'success' | 'error' | 'skipped'
  message: string
  macUpdateUrl?: string
  isAppStore?: boolean
}

interface ImportConfig {
  pageLimit: number
  minRating: number
  priceFilter: 'all' | 'free' | 'paid'
  category: string
  batchSize: number
  delayBetweenBatches: number
}

const MACUPDATE_CATEGORIES = [
  'all',
  'AI',
  'Browsing',
  'Business',
  'Customization',
  'Developer Tools',
  'Education',
  'Finance',
  'Games',
  'Graphic Design',
  'Health & Fitness',
  'Internet Utilities',
  'Lifestyle & Hobby',
  'Medical Software',
  'Music & Audio',
  'Photography',
  'Productivity',
  'Security',
  'System Utilities',
  'Travel',
  'Video'
]

export default function MacUpdateImportPage() {
  const [config, setConfig] = useState({
    pageLimit: 2, // Reduced from 5 to 2
    minRating: 0,
    priceFilter: 'paid',
    category: 'all',
    batchSize: 10,
    delayBetweenBatches: 1000
  })
  
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [scrapedApps, setScrapedApps] = useState<MacUpdateApp[]>([])

  const handleImport = async () => {
    setIsImporting(true)
    setProgress(0)
    setResults([])
    setError(null)
    setSuccess(null)
    setScrapedApps([])

    try {
      console.log('Starting MacUpdate import with config:', config)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(`/api/macupdate-scrape?${new URLSearchParams({
        pageLimit: config.pageLimit.toString(),
        minRating: config.minRating.toString(),
        priceFilter: config.priceFilter,
        category: config.category
      })}`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('MacUpdate API response:', data)
      console.log('Apps array:', data.apps)
      console.log('Apps length:', data.apps?.length)
      
      if (data.success && data.apps && data.apps.length > 0) {
        setScrapedApps(data.apps)
        setSuccess(`Found ${data.apps.length} apps from MacUpdate. Starting import...`)
        
        // Step 2: Import apps in batches
        await importAppsInBatches(data.apps)
      } else {
        setSuccess('No apps found from MacUpdate')
      }

    } catch (err: unknown) {
      let errorMessage: string
      if (typeof err === 'string') {
        errorMessage = err
      } else if (err instanceof Error) {
        errorMessage = (err as Error).message
      } else {
        errorMessage = 'Import failed'
      }
      setError(errorMessage)
    } finally {
      setIsImporting(false)
      setShowResults(true)
    }
  }

  const importAppsInBatches = async (apps: MacUpdateApp[]) => {
    const totalApps = apps.length
    let processed = 0

    // Helper function to map category name to category ID
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
          // Get category ID by slug
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
      return null // Default to utilities if no match
    }

    // Process apps in batches
    for (let i = 0; i < apps.length; i += config.batchSize) {
      const batch = apps.slice(i, i + config.batchSize)
      
      for (const app of batch) {
        try {
          // Try to find app in iTunes first
          const itunesResponse = await fetch(`/api/itunes/search?term=${encodeURIComponent(app.name)}&entity=macSoftware&limit=1`)
          
          let isAppStore = false
          let itunesData = null
          
          if (itunesResponse.ok) {
            const itunesResult = await itunesResponse.json()
            if (itunesResult.results && itunesResult.results.length > 0) {
              const itunesApp = itunesResult.results[0]
              if (itunesApp.kind === 'mac-software') {
                isAppStore = true
                itunesData = itunesApp
              }
            }
          }

          // Get category ID
          const categoryId = await getCategoryId(app.category || 'utilities')
          
          // Build comprehensive app data object
          const appData = {
            name: app.name,
            developer: app.developer || 'Unknown',
            description: app.description || '',
            category_id: categoryId,
            price: parseFloat(app.price.replace(/[^0-9.]/g, '')) || 0,
            currency: 'USD',
            rating: app.rating || 0,
            rating_count: app.reviewCount || 0,
            version: app.version || '',
            is_on_mas: isAppStore,
            mas_id: itunesData?.trackId?.toString() || null,
            mas_url: itunesData?.trackViewUrl || null,
            app_store_url: itunesData?.trackViewUrl || null,
            website_url: app.macUpdateUrl || '',
            download_url: itunesData?.trackViewUrl || app.macUpdateUrl || '',
            icon_url: itunesData?.artworkUrl512 || itunesData?.artworkUrl100 || null,
            minimum_os_version: itunesData?.minimumOsVersion || null,
            size: itunesData?.fileSizeBytes || null,
            release_date: itunesData?.releaseDate || null,
            is_free: app.price === 'Free' || app.price === '$0.00',
            is_featured: false,
            features: itunesData?.genres ? itunesData.genres : [],
            source: isAppStore ? 'MAS' : 'CUSTOM',
            status: 'ACTIVE'
          }

          try {
            // Save the main app record
            const saveResponse = await fetch('/api/apps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(appData)
            })

            if (saveResponse.ok) {
              const savedApp = await saveResponse.json()
              console.log(`✅ Saved app to database: ${app.name} (ID: ${savedApp.id})`)

              // Save screenshots if available
              if (itunesData?.screenshotUrls && itunesData.screenshotUrls.length > 0) {
                for (let idx = 0; idx < itunesData.screenshotUrls.length; idx++) {
                  const screenshot = itunesData.screenshotUrls[idx]
                  try {
                    const screenshotData = {
                      app_id: savedApp.id,
                      url: screenshot,
                      display_order: idx + 1,
                      caption: `${app.name} Screenshot ${idx + 1}`
                    }
                    
                    const screenshotResponse = await fetch('/api/screenshots', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(screenshotData)
                    })
                    
                    if (screenshotResponse.ok) {
                      console.log(`  📸 Saved screenshot ${idx + 1} for ${app.name}`)
                    }
                  } catch (screenshotError) {
                    console.error(`  ❌ Failed to save screenshot for ${app.name}:`, screenshotError)
                  }
                }
              }

              // Save additional metadata if available
              if (itunesData?.releaseNotes || itunesData?.contentAdvisoryRating) {
                try {
                  const metadataData = {
                    app_id: savedApp.id,
                    release_notes: itunesData.releaseNotes || '',
                    system_requirements: itunesData.minimumOsVersion ? [`macOS ${itunesData.minimumOsVersion} or later`] : []
                  }
                  
                  const metadataResponse = await fetch('/api/custom-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(metadataData)
                  })
                  
                  if (metadataResponse.ok) {
                    console.log(`  📝 Saved metadata for ${app.name}`)
                  }
                } catch (metadataError) {
                  console.error(`  ❌ Failed to save metadata for ${app.name}:`, metadataError)
                }
              }

              setResults(prev => [...prev, {
                name: app.name,
                developer: app.developer || 'Unknown',
                status: 'success',
                message: isAppStore ? 
                  `Saved with ${itunesData?.screenshotUrls?.length || 0} screenshots (App Store app)` : 
                  'Saved to database (MacUpdate only)',
                macUpdateUrl: app.macUpdateUrl,
                isAppStore
              }])
            } else {
              const error = await saveResponse.text()
              console.error(`❌ Failed to save app ${app.name}:`, error)
              setResults(prev => [...prev, {
                name: app.name,
                developer: app.developer || 'Unknown',
                status: 'error',
                message: `Failed to save: ${error}`,
                macUpdateUrl: app.macUpdateUrl,
                isAppStore
              }])
            }
          } catch (saveError) {
            console.error(`❌ Error saving app ${app.name}:`, saveError)
            setResults(prev => [...prev, {
              name: app.name,
              developer: app.developer || 'Unknown',
              status: 'error',
              message: `Save error: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
              macUpdateUrl: app.macUpdateUrl,
              isAppStore
            }])
          }

        } catch (err: unknown) {
          let errorMessage: string
          if (typeof err === 'string') {
            errorMessage = err
          } else if (err instanceof Error) {
            errorMessage = (err as Error).message
          } else {
            errorMessage = 'Import failed'
          }
          
          setResults(prev => [...prev, {
            name: app.name,
            developer: app.developer || 'Unknown',
            status: 'error',
            message: errorMessage,
            macUpdateUrl: app.macUpdateUrl
          }])
        }

        processed++
        setProgress((processed / totalApps) * 100)

                  // Delay between imports
          if (config.delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches))
          }
      }

      // Longer delay between batches
      if (i + config.batchSize < apps.length) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />
      case 'error': return <ErrorIcon color="error" />
      case 'skipped': return <Warning color="warning" />
      default: return <Info color="info" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success'
      case 'error': return 'error'
      case 'skipped': return 'warning'
      default: return 'info'
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const skippedCount = results.filter(r => r.status === 'skipped').length
  const appStoreCount = results.filter(r => r.isAppStore).length
  const macUpdateOnlyCount = results.filter(r => !r.isAppStore).length

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        MacUpdate Bulk Import
      </Typography>

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

      {/* Import Summary */}
      {results.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Import Summary:</strong> {successCount} processed, {errorCount} failed, {appStoreCount} App Store apps, {macUpdateOnlyCount} MacUpdate only
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                MacUpdate Import Configuration
              </Typography>

              <TextField
                fullWidth
                type="number"
                label="Page Limit"
                value={config.pageLimit}
                onChange={(e) => setConfig({ ...config, pageLimit: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
                inputProps={{ min: 1, max: 10 }}
                helperText="Number of MacUpdate pages to scrape (max 10 for Netlify timeout)"
              />

              <TextField
                fullWidth
                type="number"
                label="Min Rating"
                value={config.minRating}
                onChange={(e) => setConfig({ ...config, minRating: parseFloat(e.target.value) })}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, max: 5, step: 0.1 }}
                helperText="Minimum rating (0 for new apps, 3.5+ for established apps)"
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Price Filter</InputLabel>
                <Select
                  value={config.priceFilter}
                  label="Price Filter"
                  onChange={(e) => setConfig({ ...config, priceFilter: e.target.value as any })}
                >
                  <MenuItem value="all">All Apps</MenuItem>
                  <MenuItem value="free">Free Apps</MenuItem>
                  <MenuItem value="paid">Paid Apps</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={config.category}
                  label="Category"
                  onChange={(e) => setConfig({ ...config, category: e.target.value })}
                >
                  {MACUPDATE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Performance Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Batch Size"
                        value={config.batchSize}
                        onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) })}
                        inputProps={{ min: 1, max: 50 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Delay (ms)"
                        value={config.delayBetweenBatches}
                        onChange={(e) => setConfig({ ...config, delayBetweenBatches: parseInt(e.target.value) })}
                        inputProps={{ min: 0, max: 10000 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={isImporting ? <Stop /> : <PlayArrow />}
                onClick={handleImport}
                disabled={isImporting}
                sx={{ mt: 2 }}
              >
                {isImporting ? 'Stop Import' : 'Start MacUpdate Import'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Progress and Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Progress
              </Typography>

              {isImporting && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {Math.round(progress)}% Complete
                  </Typography>
                </Box>
              )}

              {results.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Import Summary
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`${successCount} Success`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${errorCount} Errors`}
                      color="error"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${appStoreCount} App Store`}
                      color="info"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${macUpdateOnlyCount} MacUpdate Only`}
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}

              {results.length > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setShowResults(!showResults)}
                  sx={{ mb: 2 }}
                >
                  {showResults ? 'Hide' : 'Show'} Detailed Results
                </Button>
              )}

              {showResults && results.length > 0 && (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {results.map((result, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={result.name}
                        secondary={`${result.developer} - ${result.message}`}
                      />
                      <ListItemSecondaryAction>
                        {getStatusIcon(result.status)}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
} 