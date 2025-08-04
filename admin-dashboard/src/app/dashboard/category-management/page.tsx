'use client'

import React, { useState, useEffect } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import {
  PlayArrow,
  CheckCircle,
  Error,
  Refresh,
  Download,
  Upload,
  Visibility,
  Edit,
  CloudDownload,
  Info,
  Warning,
  ExpandMore,
  Settings,
  Add,
  Apps
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

interface CategoryProgress {
  categoryUrl: string
  categoryName: string
  totalPages: number
  pagesScraped: number
  pagesImported: number
  pagesPending: number
  lastScrapedPage: number
  lastImportedPage: number
  scrapeProgressPercent: number
  importProgressPercent: number
  pages: Array<{
    pageNumber: number
    sessionId: string
    sessionName: string
    status: 'scraped' | 'imported' | 'failed'
    createdAt: string
    appsImported: number
    appsSkipped: number
  }>
  summary: {
    totalPages: number
    pagesScraped: number
    pagesImported: number
    pagesPending: number
    nextPageToScrape: number
    nextPageToImport: number | null
  }
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
  pagination?: {
    currentPage: number
    totalPages: number
    processedPages: number[]
  }
}

interface ImportResult {
  success: boolean
  appId?: string
  message: string
  isNew: boolean
  screenshots?: number
  metadata?: boolean
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

export default function CategoryManagementPage() {
  // Category Management State
  const [categoryUrl, setCategoryUrl] = useState('https://www.macupdate.com/explore/categories/music-audio')
  const [progress, setProgress] = useState<CategoryProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importingPage, setImportingPage] = useState<number | null>(null)
  const [scrapingPages, setScrapingPages] = useState(false)

  // Single App Import State
  const [manualUrl, setManualUrl] = useState('')
  const [isManualScraping, setIsManualScraping] = useState(false)
  const [scrapedApp, setScrapedApp] = useState<MacUpdateApp | null>(null)

  // Category Import State
  const [categoryPreview, setCategoryPreview] = useState<CategoryPreview | null>(null)
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [includePreviews, setIncludePreviews] = useState(false)
  const [resetPageTracking, setResetPageTracking] = useState(false)
  const [isCategoryScraping, setIsCategoryScraping] = useState(false)

  // Import Process State
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult[]>([])

  // UI State
  const [activeTab, setActiveTab] = useState<'management' | 'import'>('management')
  const [stats, setStats] = useState({
    totalApps: 0,
    macUpdateApps: 0,
    recentImports: 0
  })

  // Load stats on component mount
  useEffect(() => {
    loadStats()
  }, [])

  // Load progress on mount and when category URL changes
  useEffect(() => {
    if (categoryUrl.trim()) {
      loadCategoryProgress()
    }
  }, [categoryUrl])

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

  // Load category progress
  const loadCategoryProgress = async () => {
    if (!categoryUrl.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/category-progress?categoryUrl=${encodeURIComponent(categoryUrl.trim())}`)
      
      if (!response.ok) {
        throw `HTTP error! status: ${response.status}`
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      } else {
        setError(data.error || 'Failed to load category progress')
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to load category progress'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Re-import a specific page using our current working code
  const reimportPage = async (pageNumber: number) => {
    setImportingPage(pageNumber)
    setError(null)
    setSuccess(null)

    try {
      console.log(`Step 1/3: Scraping page ${pageNumber} for apps...`)
      setSuccess(`Step 1/3: Scraping page ${pageNumber} for apps...`)
      
      // Step 1: Scrape the specific page to get app URLs
      const response = await fetch('/api/macupdate-category-scraper', {
        method: 'POST', // Use full data mode
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryUrl: categoryUrl.trim(),
          limit: 20,
          pages: 1,
          preview: true,
          page: pageNumber // Specify the page to scrape
        })
      })
      
      if (!response.ok) {
        throw `HTTP error! status: ${response.status}`
      }
      
      const data = await response.json()
      
      if (data.success && data.appUrls && data.appUrls.length > 0) {
        console.log(`Step 2/3: Importing ${data.appUrls.length} apps from page ${pageNumber}...`)
        setSuccess(`Step 2/3: Importing ${data.appUrls.length} apps from page ${pageNumber}...`)
        
        let imported = 0
        let skipped = 0
        
        // Step 2: Import each app individually to get full data
        for (let i = 0; i < data.appUrls.length; i++) {
          const appUrl = data.appUrls[i]
          const progressPercent = Math.round(((i + 1) / data.appUrls.length) * 100)
          
          try {
            setSuccess(`Step 2/3: Importing app ${i + 1}/${data.appUrls.length} (${progressPercent}%)...`)
            
            // Scrape the individual app
            const scrapeResponse = await fetch('/api/macupdate-scraper', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'scrape-app',
                appUrl: appUrl
              })
            })
            
            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json()
              if (scrapeData.success && scrapeData.app) {
                // Import the scraped app
                const importResponse = await fetch('/api/macupdate-import/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    apps: [scrapeData.app],
                    categoryUrl: categoryUrl.trim()
                  })
                })
                
                if (importResponse.ok) {
                  const importData = await importResponse.json()
                  if (importData.success) {
                    imported++
                  } else {
                    skipped++
                  }
                } else {
                  skipped++
                }
              } else {
                skipped++
              }
            } else {
              skipped++
            }
            
            // Small delay between apps to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 300))
            
          } catch (appError) {
            console.error(`Error processing app ${appUrl}:`, appError)
            skipped++
          }
        }
        
        console.log('Step 3/3: Re-import completed')
        setSuccess(`Successfully re-imported ${imported} apps from page ${pageNumber} (${skipped} skipped)`)
        
        // Reload progress to show updated status
        await loadCategoryProgress()
      } else {
        setSuccess(`No apps found on page ${pageNumber} to re-import.`)
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to re-import page'
      setError(errorMessage)
    } finally {
      setImportingPage(null)
    }
  }

  // Scrape next page with full app details
  const scrapeNextPage = async () => {
    if (!progress) return
    
    setScrapingPages(true)
    setError(null)
    setSuccess(null)

    try {
      // Step 1: Get app URLs from the category page
      setSuccess('Step 1/3: Getting app URLs from category page...')
      const response = await fetch('/api/macupdate-category-scraper', {
        method: 'PUT', // Use fast mode to get URLs only
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryUrl: categoryUrl.trim(),
          limit: 20,
          pages: 1
        })
      })

      if (!response.ok) {
        throw `HTTP error! status: ${response.status}`
      }

      const data = await response.json()
      
      if (data.success && data.appUrls.length > 0) {
        console.log(`Found ${data.appUrls.length} apps on page ${data.pagination?.currentPage || 1}`)
        setSuccess(`Step 1/3: Found ${data.appUrls.length} apps. Step 2/3: Scraping full details...`)
        
        // Step 2: Scrape full details for each app
        const scrapedApps = []
        let scrapedCount = 0
        const totalApps = data.appUrls.length
        
        for (let i = 0; i < data.appUrls.length; i++) {
          const appUrl = data.appUrls[i]
          const progressPercent = Math.round(((i + 1) / totalApps) * 100)
          
          try {
            setSuccess(`Step 2/3: Scraping app ${i + 1}/${totalApps} (${progressPercent}%)...`)
            
            const scrapeResponse = await fetch('/api/macupdate-scraper', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'scrape-app',
                appUrl: appUrl
              })
            })
            
            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json()
              if (scrapeData.success && scrapeData.app) {
                scrapedApps.push(scrapeData.app)
                scrapedCount++
                console.log(`Successfully scraped: ${scrapeData.app.name}`)
              }
            }
            
            // Small delay to be respectful
            await new Promise(resolve => setTimeout(resolve, 300))
            
          } catch (scrapeError) {
            console.error('Error scraping app:', appUrl, scrapeError)
          }
        }
        
        // Step 3: Import all scraped apps
        if (scrapedApps.length > 0) {
          setSuccess(`Step 3/3: Importing ${scrapedApps.length} apps with full details...`)
          
          const importResponse = await fetch('/api/macupdate-import/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apps: scrapedApps })
          })
          
          if (importResponse.ok) {
            const importData = await importResponse.json()
            if (importData.success) {
              setSuccess(`✅ Successfully imported ${importData.successful} apps with full details (icons, screenshots, descriptions)! ${importData.failed} failed.`)
            } else {
              setError(importData.error || 'Import failed')
            }
          } else {
            setError('Import request failed')
          }
        } else {
          setError('No apps were successfully scraped')
        }
        
        await loadCategoryProgress()
      } else {
        setError(data.error || 'Failed to scrape page')
      }

    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to scrape page'
      setError(errorMessage)
    } finally {
      setScrapingPages(false)
    }
  }

  // Reset category progress
  const resetCategoryProgress = async () => {
    if (!categoryUrl.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/category-progress?categoryUrl=${encodeURIComponent(categoryUrl.trim())}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw `HTTP error! status: ${response.status}`
      }
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess('Category progress reset successfully! All import sessions cleared.')
        setProgress(null)
        loadStats() // Refresh stats
      } else {
        setError(data.error || 'Failed to reset category progress')
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to reset category progress'
      setError(errorMessage)
    } finally {
      setLoading(false)
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
        throw `HTTP error! status: ${response.status}`
      }
      
      const data = await response.json()
      
      if (data.success && data.app) {
        setScrapedApp(data.app)
        setSuccess(`Successfully scraped "${data.app.name}" by ${data.app.developer}`)
      } else {
        setError(data.error || 'Failed to scrape app')
      }

    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to scrape app'
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
        throw `HTTP error! status: ${response.status}`
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
      const errorMessage = typeof err === 'string' ? err : 'Import failed'
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
      console.log('Step 1/3: Scraping category for apps...')
      const response = await fetch('/api/macupdate-category-scraper', {
        method: includePreviews ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryUrl: categoryUrl.trim(),
          limit: 20,
          pages: 3,
          ...(includePreviews && { preview: true }),
          ...(resetPageTracking && { reset: true })
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          setCategoryPreview(data)
          
          // Step 2: Automatically import the scraped apps
          if (data.appUrls && data.appUrls.length > 0) {
            console.log(`Step 2/3: Importing ${data.appUrls.length} apps...`)
            
            let imported = 0
            let skipped = 0
            const scrapedApps = []
            
            // Step 2a: Scrape all apps first
            for (let i = 0; i < data.appUrls.length; i++) {
              const appUrl = data.appUrls[i]
              try {
                // Scrape the individual app
                const scrapeResponse = await fetch('/api/macupdate-scraper', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    action: 'scrape-app',
                    appUrl: appUrl
                  })
                })
                
                if (scrapeResponse.ok) {
                  const scrapeData = await scrapeResponse.json()
                  if (scrapeData.success && scrapeData.app) {
                    scrapedApps.push(scrapeData.app)
                  } else {
                    skipped++
                  }
                } else {
                  skipped++
                }
                
                // Small delay between apps to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 300))
                
              } catch (appError) {
                console.error(`Error processing app ${appUrl}:`, appError)
                skipped++
              }
            }
            
            // Step 2b: Import all scraped apps in a single batch
            if (scrapedApps.length > 0) {
              console.log(`Step 2b/3: Importing ${scrapedApps.length} scraped apps in batch...`)
              console.log(`📤 Sending batch import request:`)
              console.log(`   - apps count: ${scrapedApps.length}`)
              console.log(`   - categoryUrl: "${categoryUrl.trim()}"`)
              console.log(`   - categoryUrl type: ${typeof categoryUrl.trim()}`)
              
              const importResponse = await fetch('/api/macupdate-import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apps: scrapedApps,
                  categoryUrl: categoryUrl.trim()
                })
              })
              
              if (importResponse.ok) {
                const importData = await importResponse.json()
                if (importData.success) {
                  imported = importData.successful || scrapedApps.length
                  skipped += importData.failed || 0
                } else {
                  skipped += scrapedApps.length
                }
              } else {
                skipped += scrapedApps.length
              }
            }
            
            console.log('Step 3/3: Import completed')
            setSuccess(`Successfully scraped and imported ${imported} apps from page ${data.pagination?.currentPage || 1} (${skipped} skipped, ${data.existingApps} already existed and were filtered out)`)
            
            // Update the import session status to reflect the actual import results
            console.log(`🔄 About to call updateImportSessionStatus with: page=${data.pagination?.currentPage || 1}, imported=${imported}, skipped=${skipped}`)
            await updateImportSessionStatus(data.pagination?.currentPage || 1, imported, skipped)
            console.log(`✅ updateImportSessionStatus completed`)
          } else {
            setSuccess(`No new apps found on page ${data.pagination?.currentPage || 1}. All ${data.existingApps} apps on this page already exist in the database.`)
          }
          
          // Reload progress to show updated status
          await loadCategoryProgress()
        } else {
          setError(data.error || 'Failed to scrape category')
        }
      } else {
        throw `HTTP error! status: ${response.status}`
      }

    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to scrape category'
      setError(errorMessage)
    } finally {
      setIsCategoryScraping(false)
    }
  }

  // Update import session status after successful import
  const updateImportSessionStatus = async (pageNumber: number, appsImported: number, appsSkipped: number) => {
    try {
      console.log(`🔄 Updating import session for page ${pageNumber} with ${appsImported} imported, ${appsSkipped} skipped`)
      console.log(`📝 Category URL: ${categoryUrl.trim()}`)
      
      const response = await fetch('/api/category-import-page', {
        method: 'PUT', // Use PUT to update status only
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryUrl: categoryUrl.trim(),
          pageNumber,
          appsImported,
          appsSkipped,
          status: 'imported'
        })
      })
      
      console.log(`📡 PUT response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Successfully updated import session for page ${pageNumber}:`, data)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        console.error(`❌ Failed to update import session for page ${pageNumber}:`, errorData)
      }
    } catch (error) {
      console.error('💥 Error updating import session status:', error)
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
      const errorMessage = typeof err === 'string' ? err : 'Import failed'
      setError(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'imported':
        return <CheckCircle color="success" />
      case 'scraped':
        return <Download color="primary" />
      case 'failed':
        return <Error color="error" />
      default:
        return <Visibility color="action" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'imported':
        return 'success'
      case 'scraped':
        return 'primary'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIconImport = (success: boolean) => {
    return success ? <CheckCircle color="success" /> : <Error color="error" />
  }

  const successCount = importResults.filter(r => r.success).length
  const errorCount = importResults.filter(r => !r.success).length

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MacUpdate Management Hub
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Unified interface for managing MacUpdate category scraping, importing, and tracking progress
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Categories
              </Typography>
              <Typography variant="h4">
                {progress ? progress.pagesScraped : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={activeTab === 'management' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('management')}
          startIcon={<Apps />}
          sx={{ mr: 2 }}
        >
          Category Management
        </Button>
        <Button
          variant={activeTab === 'import' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('import')}
          startIcon={<CloudDownload />}
        >
          Import Tools
        </Button>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Category Management Tab */}
      {activeTab === 'management' && (
        <Box>
          {/* Category URL Input */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category URL
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="MacUpdate Category URL"
                  value={categoryUrl}
                  onChange={(e) => setCategoryUrl(e.target.value)}
                  placeholder="https://www.macupdate.com/explore/categories/photography"
                  disabled={loading}
                />
                <Button
                  variant="contained"
                  onClick={loadCategoryProgress}
                  disabled={loading || !categoryUrl.trim()}
                  startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                >
                  {loading ? 'Loading...' : 'Load Progress'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Category Overview */}
          {progress && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 {progress.categoryName} Category Status
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {progress.pagesScraped}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pages Scraped
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {progress.pagesImported}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pages Imported
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {progress.pagesPending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pages Pending
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {progress.summary.nextPageToScrape}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Next Page to Scrape
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Progress Bars */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Scrape Progress: {progress.scrapeProgressPercent}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.scrapeProgressPercent} 
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Import Progress: {progress.importProgressPercent}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.importProgressPercent} 
                    color="success"
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Bulk Operations */}
          {progress && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bulk Operations
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Full Data Mode:</strong> Scrapes complete app information including icons, screenshots, descriptions, and all metadata. 
                    This is the same comprehensive scraping used in the Import Tools tab.
                  </Typography>
                </Alert>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                       <Button
                       variant="contained"
                       onClick={scrapeNextPage}
                       disabled={scrapingPages || !progress}
                       startIcon={scrapingPages ? <CircularProgress size={20} /> : <Download />}
                     >
                       {scrapingPages ? 'Scraping & Importing...' : `Scrape & Import Page ${progress?.summary.nextPageToScrape || 1} (Full Details)`}
                     </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={loadCategoryProgress}
                    disabled={loading}
                    startIcon={<Refresh />}
                  >
                    Refresh Status
                  </Button>

                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={resetCategoryProgress}
                    disabled={loading || !progress}
                    startIcon={<Refresh />}
                  >
                    Reset Progress
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Page Management Table */}
          {progress && progress.pages.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Page Management
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Page Status:</strong> Shows the current state of each scraped page. 
                    <strong>Re-import:</strong> Re-scrapes and imports apps from a specific page with full details.
                  </Typography>
                </Alert>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Page</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Apps Imported</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {progress.pages.map((page) => (
                        <TableRow key={page.sessionId}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              Page {page.pageNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(page.status)}
                              label={page.status.charAt(0).toUpperCase() + page.status.slice(1)}
                              color={getStatusColor(page.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {page.appsImported} apps
                              </Typography>
                              {page.appsSkipped > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {page.appsSkipped} skipped
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(page.createdAt).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(page.createdAt).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {page.status === 'scraped' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => reimportPage(page.pageNumber)}
                                disabled={importingPage === page.pageNumber}
                                startIcon={importingPage === page.pageNumber ? <CircularProgress size={16} /> : <Upload />}
                              >
                                {importingPage === page.pageNumber ? 'Re-importing...' : 'Re-import Page'}
                              </Button>
                            )}
                            {page.status === 'imported' && (
                              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                <Chip 
                                  label={`${page.appsImported} apps imported`} 
                                  color="success" 
                                  size="small"
                                  icon={<CheckCircle />}
                                />
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => reimportPage(page.pageNumber)}
                                  disabled={importingPage === page.pageNumber}
                                  startIcon={importingPage === page.pageNumber ? <CircularProgress size={16} /> : <Refresh />}
                                >
                                  {importingPage === page.pageNumber ? 'Re-importing...' : 'Re-import'}
                                </Button>
                              </Box>
                            )}
                            {page.status === 'failed' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => reimportPage(page.pageNumber)}
                                disabled={importingPage === page.pageNumber}
                                startIcon={importingPage === page.pageNumber ? <CircularProgress size={16} /> : <Error />}
                              >
                                {importingPage === page.pageNumber ? 'Retrying...' : 'Retry Import'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {progress && progress.pages.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  No Pages Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No pages have been scraped for this category yet. Use the bulk operations above to start scraping.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Import Tools Tab */}
      {activeTab === 'import' && (
        <Grid container spacing={3}>
          {/* Import Methods */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Import Methods
                </Typography>

                {/* Single App Import */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">
                      Single App Import
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 2 }} />

                {/* Category Import */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">
                      Category Import
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label="MacUpdate Category URL"
                      placeholder="https://www.macupdate.com/explore/categories/photography"
                      value={categoryUrl}
                      onChange={(e) => setCategoryUrl(e.target.value)}
                      sx={{ mb: 2 }}
                      helperText="Enter a MacUpdate category URL"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includePreviews}
                          onChange={(e) => setIncludePreviews(e.target.checked)}
                        />
                      }
                      label="Include app previews (slower, shows app details)"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={resetPageTracking}
                          onChange={(e) => setResetPageTracking(e.target.checked)}
                        />
                      }
                      label="Reset page tracking (start from page 1)"
                      sx={{ mb: 2 }}
                    />
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Quick Mode:</strong> Gets app URLs only, faster scraping. 
                        <strong>Full Mode:</strong> Includes app details, icons, and descriptions.
                      </Typography>
                    </Alert>
                    
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={isCategoryScraping ? <CircularProgress size={20} /> : <CloudDownload />}
                      onClick={handleCategoryScrape}
                      disabled={isCategoryScraping || isImporting || !categoryUrl.trim()}
                      sx={{ mb: 2 }}
                    >
                      {isCategoryScraping ? 'Scraping Category...' : 'Scrape Next Page'}
                    </Button>
                  </AccordionDetails>
                </Accordion>

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
                        label={`${categoryPreview.appUrls.length} New Apps Available`}
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
                        icon={<Error />}
                        label={`${errorCount} Errors`}
                        color="error"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                )}

                {/* Category App List */}
                {categoryPreview && categoryPreview.appUrls.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      New Apps Available for Import ({categoryPreview.appUrls.length} total)
                    </Typography>
                    
                    {categoryPreview.appPreviews.length > 0 ? (
                      // Show detailed table when preview data is available
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
                    ) : (
                      // Show simple URL list when no preview data (ultra-fast mode)
                      <Box sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <input
                            type="checkbox"
                            checked={selectedApps.length === categoryPreview.appUrls.length}
                            onChange={(e) => e.target.checked ? handleSelectAllApps() : handleDeselectAllApps()}
                            style={{ marginRight: '8px' }}
                          />
                          <Typography variant="body2" fontWeight="medium">
                            Select All Apps
                          </Typography>
                        </Box>
                        <List dense>
                          {categoryPreview.appUrls.map((url, index) => {
                            // Extract app name from URL
                            const appName = url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown App'
                            return (
                              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedApps.includes(url)}
                                  onChange={() => handleToggleApp(url)}
                                  style={{ marginRight: '8px' }}
                                />
                                <ListItemText
                                  primary={appName}
                                  secondary={url}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                />
                              </ListItem>
                            )
                          })}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}


    </Box>
  )
} 