'use client'

import { useState, useEffect } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { importFromMAS } from '@/lib/masImport'
import { supabase } from '@/lib/supabase'

interface ImportResult {
  id: string
  name: string
  developer: string
  status: 'success' | 'error' | 'skipped'
  message: string
  masUrl?: string
}

interface ImportConfig {
  importType: 'charts' | 'topFree' | 'topPaid' | 'category' | 'developer' | 'urls'
  category: string
  developer: string
  limit: number
  qualityFilter: {
    minRating: number
    minReviews: number
    excludeGames: boolean
  }
  batchSize: number
  delay: number
}

interface iTunesApp {
  trackId: number
  trackName: string
  artistName: string
  trackViewUrl: string
  artworkUrl512?: string
  artworkUrl100?: string
  averageUserRating?: number
  userRatingCount?: number
  price?: number
  currency?: string
  primaryGenreName?: string
  minimumOsVersion?: string
  version?: string
  fileSizeBytes?: string
  releaseDate?: string
  currentVersionReleaseDate?: string
  features?: string[]
  screenshotUrls?: string[]
  description?: string
  kind?: string
  bundleId?: string
}

export default function BulkImportPage() {
  const [config, setConfig] = useState<ImportConfig>({
    importType: 'charts',
    category: '',
    developer: '',
    limit: 50,
    qualityFilter: {
      minRating: 0,   // Accept any rating (including 0)
      minReviews: 0,  // Accept any number of reviews (including 0)
      excludeGames: false // Include games too
    },
    batchSize: 10,
    delay: 2000
  })
  
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [urlList, setUrlList] = useState('')
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setProgress(0)
    setResults([])
    setError(null)
    setSuccess(null)

    try {
      let appsToImport: Array<{id: string, url: string, name: string, developer: string}> = []

      // Get apps based on import type
      switch (config.importType) {
        case 'charts':
          appsToImport = await getTopChartApps()
          break
        case 'topFree':
          appsToImport = await getTopFreeApps()
          break
        case 'topPaid':
          appsToImport = await getTopPaidApps()
          break
        case 'category':
          appsToImport = await getCategoryApps()
          break
        case 'developer':
          appsToImport = await getDeveloperApps()
          break
        case 'urls':
          appsToImport = parseUrlList()
          break
      }

      if (appsToImport.length === 0) {
        throw 'No apps found to import'
      }

      console.log(`Found ${appsToImport.length} apps before quality filtering`)

      // Apply quality filters
      const filteredApps = await applyQualityFilters(appsToImport)
      
      console.log(`After quality filtering: ${filteredApps.length} apps`)
      
      if (filteredApps.length === 0) {
        // Provide more helpful error message
        const ratingMsg = config.qualityFilter.minRating > 0 ? ` (min rating: ${config.qualityFilter.minRating})` : ''
        const reviewsMsg = config.qualityFilter.minReviews > 0 ? ` (min reviews: ${config.qualityFilter.minReviews})` : ''
        const gamesMsg = config.qualityFilter.excludeGames ? ' (games excluded)' : ''
        
        throw `No apps meet the quality criteria${ratingMsg}${reviewsMsg}${gamesMsg}. Try lowering the minimum rating or review count.`
      }

      setSuccess(`Found ${filteredApps.length} apps to import. Starting import...`)

      // Import apps in batches
      await importAppsInBatches(filteredApps)

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

  const getTopChartApps = async () => {
    const charts = ['topfreeapplications', 'toppaidapplications']
    const apps: Array<{id: string, url: string, name: string, developer: string}> = []

    for (const chart of charts) {
      try {
        console.log(`Fetching chart: ${chart}`)
        // Request more than user limit per chart to account for filtering, but not too many
        const apiLimit = Math.max(config.limit * 2, 20) // At least 20, or 2x user limit
        const response = await fetch(`/api/itunes/charts?chart=${chart}&entity=macSoftware&limit=${apiLimit}`)
        
        if (!response.ok) {
          console.error(`Failed to fetch ${chart}:`, response.status, response.statusText)
          continue
        }

        const data = await response.json()
        console.log(`Chart ${chart} response:`, {
          resultCount: data.resultCount,
          results: data.results?.length || 0
        })
        
        if (data.results && data.results.length > 0) {
          const chartApps = data.results.map((app: iTunesApp) => ({
            id: app.trackId?.toString() || 'unknown',
            url: app.trackViewUrl || '',
            name: app.trackName || 'Unknown',
            developer: app.artistName || 'Unknown'
          })).filter((app: {id: string, url: string, name: string, developer: string}) => {
            // Basic validation - just ensure we have required fields
            return app.id !== 'unknown' && app.url && app.name !== 'Unknown'
          })
          
          console.log(`Found ${chartApps.length} valid apps from ${chart}`)
          apps.push(...chartApps)
        } else {
          console.log(`No results found for chart: ${chart}`)
        }
      } catch (err) {
        console.error(`Error fetching ${chart}:`, err)
      }
    }

    console.log(`Total apps found: ${apps.length}`)
    
    // Apply the user's total limit across all charts
    const limitedApps = apps.slice(0, config.limit)
    console.log(`Limited to user's requested amount: ${limitedApps.length} (requested: ${config.limit})`)
    
    return limitedApps
  }

  const getTopFreeApps = async () => {
    console.log('Fetching top free apps from Mac App Store charts...')
    
    try {
      const response = await fetch(`/api/mac-app-store-charts?type=top-free&limit=${config.limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch top free apps from Mac App Store')
      }

      const data = await response.json()
      const apps = data.results || []

      console.log(`Found ${apps.length} top free apps from Mac App Store charts`)

      return apps.map((app: iTunesApp) => ({
        id: app.trackId?.toString() || 'unknown',
        url: app.trackViewUrl || '',
        name: app.trackName || 'Unknown',
        developer: app.artistName || 'Unknown'
      })).filter((app: {id: string, url: string, name: string, developer: string}) => {
        return app.id !== 'unknown' && app.url && app.name !== 'Unknown'
      })
    } catch (error) {
      console.error('Error fetching top free apps:', error)
      throw error
    }
  }

  const getTopPaidApps = async () => {
    console.log('Fetching top paid apps from Mac App Store charts...')
    
    try {
      const response = await fetch(`/api/mac-app-store-charts?type=top-paid&limit=${config.limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch top paid apps from Mac App Store')
      }

      const data = await response.json()
      const apps = data.results || []

      console.log(`Found ${apps.length} top paid apps from Mac App Store charts`)

      return apps.map((app: iTunesApp) => ({
        id: app.trackId?.toString() || 'unknown',
        url: app.trackViewUrl || '',
        name: app.trackName || 'Unknown',
        developer: app.artistName || 'Unknown'
      })).filter((app: {id: string, url: string, name: string, developer: string}) => {
        return app.id !== 'unknown' && app.url && app.name !== 'Unknown'
      })
    } catch (error) {
      console.error('Error fetching top paid apps:', error)
      throw error
    }
  }

  const getCategoryApps = async () => {
    if (!config.category) {
      console.log('No category selected')
      return []
    }

    console.log(`Searching for category: ${config.category}`)
    
    // Improve search terms for better results
    let searchTerm = config.category
    if (config.category === 'Graphics & Design') {
      searchTerm = 'design graphics'
    } else if (config.category === 'Video & Audio') {
      searchTerm = 'video audio'
    } else if (config.category === 'Social Networking') {
      searchTerm = 'social network'
    } else if (config.category === 'Health & Fitness') {
      searchTerm = 'health fitness'
    }
    
    console.log(`Using search term: ${searchTerm}`)
    
    try {
      const response = await fetch(`/api/itunes/search?term=${encodeURIComponent(searchTerm)}&entity=macSoftware&limit=${config.limit}`)
      console.log(`Category search response status: ${response.status}`)
      
      if (!response.ok) {
        console.error(`Category search failed: ${response.status} ${response.statusText}`)
        return []
      }

      const data = await response.json()
      console.log(`Category search results:`, {
        resultCount: data.resultCount,
        results: data.results?.length || 0
      })
      
      const apps = data.results?.map((app: any) => ({
        id: app.trackId.toString(),
        url: app.trackViewUrl,
        name: app.trackName,
        developer: app.artistName
      })) || []
      
      console.log(`Mapped ${apps.length} category apps`)
      return apps
    } catch (err) {
      console.error('Error fetching category apps:', err)
      return []
    }
  }

  const getDeveloperApps = async () => {
    if (!config.developer) return []

    try {
      const response = await fetch(`/api/itunes/search?term=${config.developer}&entity=macSoftware&limit=${config.limit}`)
      if (!response.ok) return []

      const data = await response.json()
      return data.results?.map((app: any) => ({
        id: app.trackId.toString(),
        url: app.trackViewUrl,
        name: app.trackName,
        developer: app.artistName
      })) || []
    } catch (err) {
      console.error('Error fetching developer apps:', err)
      return []
    }
  }

  const parseUrlList = () => {
    const urls = urlList.split('\n').filter(url => url.trim())
    return urls.map(url => {
      const match: RegExpMatchArray | null = url.match(/id(\d+)/)
      const id: string = match ? match[1] : 'unknown'
      return {
        id,
        url: url.trim(),
        name: 'Unknown',
        developer: 'Unknown'
      }
    })
  }

  const applyQualityFilters = async (apps: Array<{id: string, url: string, name: string, developer: string}>) => {
    const filtered: Array<{id: string, url: string, name: string, developer: string}> = []
    let checked = 0
    let passedRating = 0
    let passedReviews = 0
    let passedCategory = 0

    console.log(`Applying quality filters to ${apps.length} apps...`)
    console.log(`Quality criteria: minRating=${config.qualityFilter.minRating}, minReviews=${config.qualityFilter.minReviews}, excludeGames=${config.qualityFilter.excludeGames}`)

    for (const app of apps) {
      try {
        checked++
        // Fetch detailed app data to check quality
        const response = await fetch(`/api/itunes?id=${app.id}`)
        if (!response.ok) {
          console.log(`App ${app.id}: API response not ok (${response.status})`)
          continue
        }

        const data = await response.json()
        if (!data.results || data.results.length === 0) {
          console.log(`App ${app.id}: No results from API`)
          continue
        }

        const appData = data.results[0]
        
        // Try to get actual ratings from App Store web scraping
        let scrapedRating = 0
        let scrapedReviews = 0
        try {
          const scrapeResponse = await fetch(`/api/scrape-app-rating?id=${app.id}`)
          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json()
            scrapedRating = scrapeData.rating || 0
            scrapedReviews = scrapeData.reviewCount || 0
            console.log(`App ${app.id} scraped ratings:`, { rating: scrapedRating, reviews: scrapedReviews })
          }
        } catch (scrapeError) {
          console.log(`App ${app.id}: Failed to scrape ratings:`, scrapeError)
        }
        
        // Debug: Log the full app data to see what we're getting
        console.log(`App ${app.id} raw data:`, {
          trackName: appData.trackName,
          averageUserRating: appData.averageUserRating,
          userRatingCount: appData.userRatingCount,
          averageUserRatingForCurrentVersion: appData.averageUserRatingForCurrentVersion,
          userRatingCountForCurrentVersion: appData.userRatingCountForCurrentVersion,
          primaryGenreName: appData.primaryGenreName,
          kind: appData.kind,
          price: appData.price
        })
        
        // Apply quality filters - use scraped ratings if available, fallback to iTunes API
        const rating = scrapedRating > 0 ? scrapedRating : 
                      (appData.averageUserRating || 
                       appData.averageUserRatingForCurrentVersion || 0)
        const reviews = scrapedReviews > 0 ? scrapedReviews : 
                       (appData.userRatingCount || 
                        appData.userRatingCountForCurrentVersion || 0)
        const category = appData.primaryGenreName || ''
        
        const ratingPass = rating >= config.qualityFilter.minRating
        const reviewsPass = reviews >= config.qualityFilter.minReviews
        const categoryPass = !config.qualityFilter.excludeGames || category !== 'Games'
        
        if (ratingPass) passedRating++
        if (reviewsPass) passedReviews++
        if (categoryPass) passedCategory++
        
        if (ratingPass && reviewsPass && categoryPass) {
          console.log(`App ${app.id} (${appData.trackName}): PASSED - Rating: ${rating}, Reviews: ${reviews}, Category: ${category}`)
          filtered.push({
            ...app,
            name: appData.trackName,
            developer: appData.artistName
          })
        } else {
          console.log(`App ${app.id} (${appData.trackName}): FAILED - Rating: ${rating} (need ${config.qualityFilter.minRating}) [${ratingPass ? 'PASS' : 'FAIL'}], Reviews: ${reviews} (need ${config.qualityFilter.minReviews}) [${reviewsPass ? 'PASS' : 'FAIL'}], Category: ${category} [${categoryPass ? 'PASS' : 'FAIL'}]`)
        }
      } catch (err) {
        console.error(`Error checking quality for app ${app.id}:`, err)
      }
    }

    console.log(`Quality filter results: ${checked} checked, ${passedRating} passed rating, ${passedReviews} passed reviews, ${passedCategory} passed category, ${filtered.length} total passed`)
    return filtered
  }

  const importAppsInBatches = async (apps: Array<{id: string, url: string, name: string, developer: string}>) => {
    const totalApps = apps.length
    let processed = 0

    for (let i = 0; i < apps.length; i += config.batchSize) {
      const batch = apps.slice(i, i + config.batchSize)
      
      // Process batch
      for (const app of batch) {
        try {
          const result = await importFromMAS(app.url)
          
          setResults(prev => [...prev, {
            id: app.id,
            name: app.name,
            developer: app.developer,
            status: result ? 'success' : 'error',
            message: result ? 'Imported successfully' : 'Import failed',
            masUrl: app.url
          }])
        } catch (err: unknown) {
          let errorMessage: string
          let status: 'success' | 'error' | 'skipped' = 'error'
          
          if (typeof err === 'string') {
            errorMessage = err
          } else if (err instanceof Error) {
            errorMessage = (err as Error).message
            // Check if this is an "already exists" error
            if (errorMessage.includes('already exists in the database')) {
              status = 'skipped'
              errorMessage = 'App already exists - skipped'
            }
          } else {
            errorMessage = 'Import failed'
          }
          
          setResults(prev => [...prev, {
            id: app.id,
            name: app.name,
            developer: app.developer,
            status,
            message: errorMessage,
            masUrl: app.url
          }])
        }

        processed++
        setProgress((processed / totalApps) * 100)

        // Delay between imports
        if (config.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, config.delay))
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
  
  // Show summary if we have results
  const showSummary = results.length > 0

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bulk Import Mac Apps
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
      {showSummary && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Import Summary:</strong> {successCount} imported, {skippedCount} skipped (already exist), {errorCount} failed
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Import Type</InputLabel>
                <Select
                  value={config.importType}
                  label="Import Type"
                  onChange={(e) => setConfig({ ...config, importType: e.target.value as any })}
                >
                  <MenuItem value="charts">Top Charts (Free + Paid)</MenuItem>
                  <MenuItem value="topFree">Top Free Apps</MenuItem>
                  <MenuItem value="topPaid">Top Paid Apps</MenuItem>
                  <MenuItem value="category">By Category</MenuItem>
                  <MenuItem value="developer">By Developer</MenuItem>
                  <MenuItem value="urls">From URL List</MenuItem>
                </Select>
              </FormControl>

              {config.importType === 'category' && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={config.category}
                    label="Category"
                    onChange={(e) => setConfig({ ...config, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {config.importType === 'developer' && (
                <TextField
                  fullWidth
                  label="Developer Name"
                  value={config.developer}
                  onChange={(e) => setConfig({ ...config, developer: e.target.value })}
                  sx={{ mb: 2 }}
                  placeholder="e.g., Microsoft, Adobe"
                />
              )}

              {config.importType === 'urls' && (
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Mac App Store URLs"
                  value={urlList}
                  onChange={(e) => setUrlList(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="https://apps.apple.com/us/app/notion/id123456789&#10;https://apps.apple.com/us/app/slack/id803453959"
                  helperText="One URL per line"
                />
              )}

              <TextField
                fullWidth
                type="number"
                label="Limit"
                value={config.limit}
                onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
                inputProps={{ min: 1, max: 200 }}
              />

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Quality Filters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Min Rating"
                        value={config.qualityFilter.minRating}
                        onChange={(e) => setConfig({
                          ...config,
                          qualityFilter: {
                            ...config.qualityFilter,
                            minRating: parseFloat(e.target.value)
                          }
                        })}
                        inputProps={{ min: 0, max: 5, step: 0.1 }}
                        helperText="Note: Most macOS apps have rating 0. Use 0 to include all apps."
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Min Reviews"
                        value={config.qualityFilter.minReviews}
                        onChange={(e) => setConfig({
                          ...config,
                          qualityFilter: {
                            ...config.qualityFilter,
                            minReviews: parseInt(e.target.value)
                          }
                        })}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.qualityFilter.excludeGames}
                            onChange={(e) => setConfig({
                              ...config,
                              qualityFilter: {
                                ...config.qualityFilter,
                                excludeGames: e.target.checked
                              }
                            })}
                          />
                        }
                        label="Exclude Games"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

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
                        value={config.delay}
                        onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) })}
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
                {isImporting ? 'Stop Import' : 'Start Import'}
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
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
                      icon={<Warning />}
                      label={`${skippedCount} Skipped`}
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