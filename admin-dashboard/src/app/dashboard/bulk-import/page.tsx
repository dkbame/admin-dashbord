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
  Error,
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
  importType: 'charts' | 'category' | 'developer' | 'urls'
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

export default function BulkImportPage() {
  const [config, setConfig] = useState<ImportConfig>({
    importType: 'charts',
    category: '',
    developer: '',
    limit: 50,
    qualityFilter: {
      minRating: 3.5,
      minReviews: 50,
      excludeGames: true
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
        throw new Error('No apps found to import')
      }

      // Apply quality filters
      const filteredApps = await applyQualityFilters(appsToImport)
      
      if (filteredApps.length === 0) {
        throw new Error('No apps meet the quality criteria')
      }

      setSuccess(`Found ${filteredApps.length} apps to import. Starting import...`)

      // Import apps in batches
      await importAppsInBatches(filteredApps)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed'
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
        const response = await fetch(`/api/itunes/charts?chart=${chart}&entity=macSoftware&limit=${config.limit}`)
        if (!response.ok) continue

        const data = await response.json()
        if (data.results) {
          apps.push(...data.results.map((app: any) => ({
            id: app.trackId.toString(),
            url: app.trackViewUrl,
            name: app.trackName,
            developer: app.artistName
          })))
        }
      } catch (err) {
        console.error(`Error fetching ${chart}:`, err)
      }
    }

    return apps
  }

  const getCategoryApps = async () => {
    if (!config.category) return []

    try {
      const response = await fetch(`/api/itunes/search?term=${config.category}&entity=macSoftware&limit=${config.limit}`)
      if (!response.ok) return []

      const data = await response.json()
      return data.results?.map((app: any) => ({
        id: app.trackId.toString(),
        url: app.trackViewUrl,
        name: app.trackName,
        developer: app.artistName
      })) || []
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
      const match = url.match(/id(\d+)/)
      const id = match ? match[1] : 'unknown'
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

    for (const app of apps) {
      try {
        // Fetch detailed app data to check quality
        const response = await fetch(`/api/itunes?id=${app.id}`)
        if (!response.ok) continue

        const data = await response.json()
        if (!data.results || data.results.length === 0) continue

        const appData = data.results[0]
        
        // Apply quality filters
        const rating = appData.averageUserRating || 0
        const reviews = appData.userRatingCount || 0
        const category = appData.primaryGenreName || ''
        
        if (rating >= config.qualityFilter.minRating &&
            reviews >= config.qualityFilter.minReviews &&
            (!config.qualityFilter.excludeGames || category !== 'Games')) {
          filtered.push({
            ...app,
            name: appData.trackName,
            developer: appData.artistName
          })
        }
      } catch (err) {
        console.error(`Error checking quality for app ${app.id}:`, err)
      }
    }

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
        } catch (err) {
          setResults(prev => [...prev, {
            id: app.id,
            name: app.name,
            developer: app.developer,
            status: 'error',
            message: err instanceof Error ? err.message : 'Import failed',
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
      case 'error': return <Error color="error" />
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
                  <MenuItem value="charts">Top Charts</MenuItem>
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
                      icon={<Error />}
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