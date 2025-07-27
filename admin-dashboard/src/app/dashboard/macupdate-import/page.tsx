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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  Refresh,
  Settings,
  Analytics,
  History
} from '@mui/icons-material'

interface MacUpdateApp {
  name: string
  developer: string
  version: string
  price: number | null
  currency: string
  rating: number | null
  rating_count: number
  download_count: number
  description: string
  category: string
  system_requirements: string[]
  screenshots: string[]
  icon_url: string
  macupdate_url: string
  release_date?: Date
  last_updated: Date
  file_size?: string
  requirements?: string
}

interface ImportResult {
  success: boolean
  appId?: string
  message: string
  isNew: boolean
  screenshots?: number
  metadata?: boolean
}

interface ScrapingConfig {
  pageLimit: number
  minRating: number
  priceFilter: 'all' | 'free' | 'paid'
  category: string
  delayBetweenRequests: number
  timeout: number
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
  const [config, setConfig] = useState<ScrapingConfig>({
    pageLimit: 2,
    minRating: 0,
    priceFilter: 'all',
    category: 'all',
    delayBetweenRequests: 2000,
    timeout: 30000
  })
  
  const [manualUrl, setManualUrl] = useState('')
  const [isScraping, setIsScraping] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [scrapingProgress, setScrapingProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [scrapedApps, setScrapedApps] = useState<MacUpdateApp[]>([])
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [stats, setStats] = useState({
    totalApps: 0,
    macUpdateApps: 0,
    recentImports: 0
  })

  // Load stats on component mount
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/macupdate-import/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleScrape = async () => {
    setIsScraping(true)
    setScrapingProgress(0)
    setScrapedApps([])
    setError(null)
    setSuccess(null)

    try {
      console.log('Starting MacUpdate scraping with config:', config)
      
      const response = await fetch('/api/macupdate-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape-listings',
          config
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.apps) {
        setScrapedApps(data.apps)
        setSuccess(`Successfully scraped ${data.apps.length} apps from MacUpdate`)
        setScrapingProgress(100)
      } else {
        setError(data.error || 'Failed to scrape apps')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Scraping failed'
      setError(errorMessage)
    } finally {
      setIsScraping(false)
    }
  }

  const handleManualScrape = async () => {
    if (!manualUrl.trim()) {
      setError('Please enter a MacUpdate URL')
      return
    }

    setIsScraping(true)
    setScrapingProgress(0)
    setScrapedApps([])
    setError(null)
    setSuccess(null)

    try {
      console.log('Starting manual MacUpdate scraping for URL:', manualUrl)
      
      const response = await fetch('/api/macupdate-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape-app',
          appUrl: manualUrl
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.app) {
        setScrapedApps([data.app])
        setSuccess(`Successfully scraped app: ${data.app.name}`)
        setScrapingProgress(100)
      } else {
        setError(data.error || 'Failed to scrape app')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Manual scraping failed'
      setError(errorMessage)
    } finally {
      setIsScraping(false)
    }
  }

  const handleImport = async () => {
    if (scrapedApps.length === 0) {
      setError('No apps to import. Please scrape apps first.')
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportResults([])
    setError(null)

    try {
      const response = await fetch('/api/macupdate-import/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps: scrapedApps })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setImportResults(data.results)
        setSuccess(`Import completed: ${data.successful} successful, ${data.failed} failed`)
        setImportProgress(100)
        loadStats() // Refresh stats
      } else {
        setError(data.error || 'Import failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed'
      setError(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  const handleScrapeAndImport = async () => {
    await handleScrape()
    if (scrapedApps.length > 0) {
      await handleImport()
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle color="success" /> : <ErrorIcon color="error" />
  }

  const successCount = importResults.filter(r => r.success).length
  const errorCount = importResults.filter(r => !r.success).length
  const newAppsCount = importResults.filter(r => r.success && r.isNew).length
  const existingAppsCount = importResults.filter(r => r.success && !r.isNew).length

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MacUpdate Scraper & Importer
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Scrape macOS applications from MacUpdate and import them into your database.
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Apps
              </Typography>
              <Typography variant="h4">
                {stats.totalApps}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                MacUpdate Apps
              </Typography>
              <Typography variant="h4">
                {stats.macUpdateApps}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Recent Imports (7 days)
              </Typography>
              <Typography variant="h4">
                {stats.recentImports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manual App Scraping
              </Typography>

              <TextField
                fullWidth
                label="MacUpdate App URL"
                placeholder="https://istat-menus.macupdate.com/"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Enter a specific MacUpdate app URL to scrape"
              />

              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={isScraping ? <CircularProgress size={20} /> : <CloudDownload />}
                onClick={handleManualScrape}
                disabled={isScraping || isImporting || !manualUrl.trim()}
                sx={{ mb: 3 }}
              >
                {isScraping ? 'Scraping...' : 'Scrape Single App'}
              </Button>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Bulk Scraping Configuration
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
                helperText="Minimum rating (0 for all apps, 3.5+ for established apps)"
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
                  <Typography>Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Delay (ms)"
                        value={config.delayBetweenRequests}
                        onChange={(e) => setConfig({ ...config, delayBetweenRequests: parseInt(e.target.value) })}
                        inputProps={{ min: 1000, max: 10000 }}
                        helperText="Delay between requests"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Timeout (ms)"
                        value={config.timeout}
                        onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                        inputProps={{ min: 10000, max: 60000 }}
                        helperText="Request timeout"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={isScraping ? <CircularProgress size={20} /> : <CloudDownload />}
                  onClick={handleScrape}
                  disabled={isScraping || isImporting}
                  fullWidth
                >
                  {isScraping ? 'Scraping...' : 'Scrape Apps'}
                </Button>
                
                <Button
                  variant="contained"
                  color="success"
                  startIcon={isImporting ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={handleImport}
                  disabled={isImporting || scrapedApps.length === 0}
                  fullWidth
                >
                  {isImporting ? 'Importing...' : 'Import Apps'}
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isScraping || isImporting ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={handleScrapeAndImport}
                  disabled={isScraping || isImporting}
                  fullWidth
                >
                  {isScraping || isImporting ? 'Processing...' : 'Scrape & Import'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Progress and Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Progress & Results
              </Typography>

              {/* Scraping Progress */}
              {isScraping && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Scraping Progress
                  </Typography>
                  <LinearProgress variant="determinate" value={scrapingProgress} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {Math.round(scrapingProgress)}% Complete
                  </Typography>
                </Box>
              )}

              {/* Import Progress */}
              {isImporting && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Import Progress
                  </Typography>
                  <LinearProgress variant="determinate" value={importProgress} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {Math.round(importProgress)}% Complete
                  </Typography>
                </Box>
              )}

              {/* Scraped Apps Summary */}
              {scrapedApps.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Scraped Apps: {scrapedApps.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<Info />}
                      label={`${scrapedApps.filter(a => a.price === 0).length} Free`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${scrapedApps.filter(a => a.price && a.price > 0).length} Paid`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${scrapedApps.filter(a => a.rating && a.rating >= 4).length} 4+ Stars`}
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}

              {/* Import Results Summary */}
              {importResults.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Import Results
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
                      label={`${newAppsCount} New`}
                      color="info"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${existingAppsCount} Existing`}
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}

              {/* Show Results Button */}
              {importResults.length > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setShowResults(!showResults)}
                  sx={{ mb: 2 }}
                >
                  {showResults ? 'Hide' : 'Show'} Detailed Results
                </Button>
              )}

              {/* Detailed Results */}
              {showResults && importResults.length > 0 && (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>App</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {scrapedApps[index]?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {scrapedApps[index]?.developer || 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusIcon(result.success)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {result.message}
                            </Typography>
                            {result.screenshots && (
                              <Typography variant="caption" display="block">
                                Screenshots: {result.screenshots}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
} 