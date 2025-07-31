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
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material'
import {
  CloudDownload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  PlayArrow,
  Refresh,
  Settings
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
  developer_website_url?: string
  release_date?: Date
  last_updated: Date
  file_size?: string
  requirements?: string
  architecture?: string
}

interface ImportResult {
  success: boolean
  appId?: string
  message: string
  isNew: boolean
  screenshots?: number
  metadata?: boolean
}

interface CategoryPreview {
  categoryName: string
  totalApps: number
  newApps: number
  existingApps: number
  appUrls: string[]
  appPreviews: Array<{
    name: string
    developer: string
    price: number | null
    rating: number | null
    url: string
  }>
}

// Popular MacUpdate categories for quick access
const POPULAR_CATEGORIES = [
  {
    name: 'Developer Tools',
    url: 'https://www.macupdate.com/explore/categories/developer-tools',
    description: 'IDEs, compilers, and development utilities'
  },
  {
    name: 'Graphics & Design',
    url: 'https://www.macupdate.com/explore/categories/graphic-design',
    description: 'Design software, image editors, and creative tools'
  },
  {
    name: 'Productivity',
    url: 'https://www.macupdate.com/explore/categories/productivity',
    description: 'Office apps, task managers, and productivity tools'
  },
  {
    name: 'Utilities',
    url: 'https://www.macupdate.com/explore/categories/system-utilities',
    description: 'System utilities, maintenance, and optimization tools'
  },
  {
    name: 'Security',
    url: 'https://www.macupdate.com/explore/categories/security',
    description: 'Antivirus, VPN, and security applications'
  }
]

export default function MacUpdateImportPage() {
  // State for single app import
  const [manualUrl, setManualUrl] = useState('')
  const [isManualScraping, setIsManualScraping] = useState(false)
  const [scrapedApp, setScrapedApp] = useState<MacUpdateApp | null>(null)
  
  // State for category import
  const [categoryUrl, setCategoryUrl] = useState('')
  const [isCategoryScraping, setIsCategoryScraping] = useState(false)
  const [categoryPreview, setCategoryPreview] = useState<CategoryPreview | null>(null)
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  
  // State for import process
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  
  // General state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalApps: 0,
    macUpdateApps: 0,
    recentImports: 0,
    recentSessions: []
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

  // Single app scraping
  const handleManualScrape = async () => {
    if (!manualUrl.trim()) {
      setError('Please enter a MacUpdate app URL')
      return
    }

    setIsManualScraping(true)
    setError(null)
    setSuccess(null)
    setScrapedApp(null)

    try {
      const response = await fetch('/api/macupdate-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape-app',
          appUrl: manualUrl.trim()
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.app) {
        setScrapedApp(data.app)
        setSuccess(`Successfully scraped "${data.app.name}" by ${data.app.developer}`)
      } else {
        setError(data.error || 'Failed to scrape app')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape app'
      setError(errorMessage)
    } finally {
      setIsManualScraping(false)
    }
  }

  const handleImportSingleApp = async () => {
    if (!scrapedApp) {
      setError('No app to import')
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
        body: JSON.stringify({ apps: [scrapedApp] })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setImportResults(data.results)
        setSuccess(`Import completed: ${data.successful} successful, ${data.failed} failed`)
        setImportProgress(100)
        loadStats()
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

  // Category scraping
  const handleCategoryScrape = async () => {
    if (!categoryUrl.trim()) {
      setError('Please enter a MacUpdate category URL')
      return
    }

    setIsCategoryScraping(true)
    setError(null)
    setSuccess(null)
    setCategoryPreview(null)
    setSelectedApps([])

    try {
      const response = await fetch('/api/macupdate-category-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryUrl: categoryUrl.trim(),
          limit: 20
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCategoryPreview(data)
        setSuccess(`Found ${data.newApps} new apps in ${data.categoryName} (${data.existingApps} already exist and were filtered out)`)
      } else {
        setError(data.error || 'Failed to scrape category')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape category'
      setError(errorMessage)
    } finally {
      setIsCategoryScraping(false)
    }
  }

  const handleSelectAllApps = () => {
    if (categoryPreview) {
      setSelectedApps(categoryPreview.appUrls)
    }
  }

  const handleDeselectAllApps = () => {
    setSelectedApps([])
  }

  const handleToggleApp = (appUrl: string) => {
    setSelectedApps(prev => 
      prev.includes(appUrl) 
        ? prev.filter(url => url !== appUrl)
        : [...prev, appUrl]
    )
  }

  const handleImportSelectedApps = async () => {
    if (selectedApps.length === 0) {
      setError('Please select at least one app to import')
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportResults([])
    setError(null)

    try {
      const totalApps = selectedApps.length
      let imported = 0
      let skipped = 0

      for (const appUrl of selectedApps) {
        try {
          const response = await fetch('/api/macupdate-scraper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'scrape-app',
              appUrl: appUrl
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.app) {
              const importResponse = await fetch('/api/macupdate-import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apps: [data.app] })
              })
              
              if (importResponse.ok) {
                const importData = await importResponse.json()
                if (importData.success) {
                  imported++
                  setImportResults(prev => [...prev, {
                    success: true,
                    appId: importData.results[0]?.appId,
                    message: 'Imported successfully',
                    isNew: importData.results[0]?.isNew || false
                  }])
                } else {
                  skipped++
                  setImportResults(prev => [...prev, {
                    success: false,
                    message: importData.error || 'Import failed',
                    isNew: false
                  }])
                }
              } else {
                skipped++
                setImportResults(prev => [...prev, {
                  success: false,
                  message: 'Import failed',
                  isNew: false
                }])
              }
            } else {
              skipped++
              setImportResults(prev => [...prev, {
                success: false,
                message: data.error || 'Scraping failed',
                isNew: false
              }])
            }
          } else {
            skipped++
            setImportResults(prev => [...prev, {
              success: false,
              message: 'Scraping failed',
              isNew: false
            }])
          }
        } catch (error) {
          skipped++
          setImportResults(prev => [...prev, {
            success: false,
            message: 'Error processing app',
            isNew: false
          }])
        }

        const progress = ((imported + skipped) / totalApps) * 100
        setImportProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setSuccess(`Import completed: ${imported} imported, ${skipped} skipped`)
      setImportProgress(100)
      loadStats()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed'
      setError(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle color="success" /> : <ErrorIcon color="error" />
  }

  const successCount = importResults.filter(r => r.success).length
  const errorCount = importResults.filter(r => !r.success).length

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MacUpdate Import
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Import macOS applications from MacUpdate with smart deduplication.
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

      {/* Recent Import Sessions */}
      {stats.recentSessions && stats.recentSessions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Import Sessions
            </Typography>
            <List dense>
              {stats.recentSessions.slice(0, 5).map((session: any, index: number) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={session.session_name}
                    secondary={`${session.apps_imported} imported, ${session.apps_skipped} skipped • ${new Date(session.created_at).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      size="small"
                      label={session.source_type}
                      color="primary"
                      variant="outlined"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

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
        {/* Import Methods */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Methods
              </Typography>

              {/* Single App Import */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Single App Import
                </Typography>
                <TextField
                  fullWidth
                  label="MacUpdate App URL"
                  placeholder="https://istat-menus.macupdate.com/"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Enter a specific MacUpdate app URL"
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={isManualScraping ? <CircularProgress size={20} /> : <CloudDownload />}
                  onClick={handleManualScrape}
                  disabled={isManualScraping || isImporting || !manualUrl.trim()}
                  sx={{ mb: 2 }}
                >
                  {isManualScraping ? 'Scraping...' : 'Scrape Single App'}
                </Button>
                {scrapedApp && (
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={handleImportSingleApp}
                    disabled={isImporting}
                  >
                    Import "{scrapedApp.name}"
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Category Import */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Category Import (New Apps Only)
                </Typography>
                <TextField
                  fullWidth
                  label="MacUpdate Category URL"
                  placeholder="https://www.macupdate.com/explore/categories/developer-tools"
                  value={categoryUrl}
                  onChange={(e) => setCategoryUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Enter a MacUpdate category URL - only shows apps not already in database"
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={isCategoryScraping ? <CircularProgress size={20} /> : <CloudDownload />}
                  onClick={handleCategoryScrape}
                  disabled={isCategoryScraping || isImporting || !categoryUrl.trim()}
                  sx={{ mb: 2 }}
                >
                  {isCategoryScraping ? 'Scraping Category...' : 'Scrape New Apps Only'}
                </Button>
              </Box>

              {/* Popular Categories */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Popular Categories
                </Typography>
                <Grid container spacing={1}>
                  {POPULAR_CATEGORIES.map((category) => (
                    <Grid item xs={12} sm={6} key={category.name}>
                      <Button
                        fullWidth
                        variant="text"
                        size="small"
                        onClick={() => setCategoryUrl(category.url)}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {category.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {category.description}
                          </Typography>
                        </Box>
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results and Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Results & Progress
              </Typography>

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

              {/* Category Preview */}
              {categoryPreview && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Category: {categoryPreview.categoryName}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`${categoryPreview.newApps} New Apps Available`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Warning />}
                      label={`${categoryPreview.existingApps} Already Exist (Filtered Out)`}
                      color="warning"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Info />}
                      label={`${selectedApps.length} Selected for Import`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  {categoryPreview.newApps > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleSelectAllApps}
                          disabled={selectedApps.length === categoryPreview.appUrls.length}
                        >
                          Select All New Apps
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleDeselectAllApps}
                          disabled={selectedApps.length === 0}
                        >
                          Deselect All
                        </Button>
                      </Box>
                      
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={isImporting ? <CircularProgress size={20} /> : <PlayArrow />}
                        onClick={handleImportSelectedApps}
                        disabled={isImporting || selectedApps.length === 0}
                        sx={{ mb: 2 }}
                      >
                        {isImporting ? 'Importing...' : `Import ${selectedApps.length} Selected Apps`}
                      </Button>
                    </Box>
                  )}
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
                  </Box>
                </Box>
              )}

              {/* Category App List */}
              {categoryPreview && categoryPreview.appPreviews.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    New Apps Available for Import ({categoryPreview.appPreviews.length} total)
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={selectedApps.length === categoryPreview.appUrls.length}
                              onChange={(e) => e.target.checked ? handleSelectAllApps() : handleDeselectAllApps()}
                            />
                          </TableCell>
                          <TableCell>App</TableCell>
                          <TableCell>Developer</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Rating</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryPreview.appPreviews.map((app, index) => (
                          <TableRow key={index}>
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedApps.includes(app.url)}
                                onChange={() => handleToggleApp(app.url)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {app.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {app.developer}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {app.price === 0 ? 'Free' : app.price ? `$${app.price}` : 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {app.rating ? `${app.rating}/5` : 'No rating'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
} 