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
  DialogActions
} from '@mui/material'
import {
  PlayArrow,
  CheckCircle,
  Error,
  Refresh,
  Download,
  Upload,
  Visibility,
  Edit
} from '@mui/icons-material'

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

export default function CategoryManagementPage() {
  const [categoryUrl, setCategoryUrl] = useState('https://www.macupdate.com/explore/categories/photography')
  const [progress, setProgress] = useState<CategoryProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingPage, setImportingPage] = useState<number | null>(null)
  const [scrapingPages, setScrapingPages] = useState(false)

  // Load category progress
  const loadCategoryProgress = async () => {
    if (!categoryUrl.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/category-progress?categoryUrl=${encodeURIComponent(categoryUrl.trim())}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      } else {
        setError(data.error || 'Failed to load category progress')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load category progress'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Import a specific page
  const importPage = async (sessionId: string, pageNumber: number) => {
    setImportingPage(pageNumber)

    try {
      const response = await fetch('/api/category-import-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pageNumber })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Reload progress to show updated status
        await loadCategoryProgress()
      } else {
        setError(data.error || 'Failed to import page')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import page'
      setError(errorMessage)
    } finally {
      setImportingPage(null)
    }
  }

  // Scrape next pages
  const scrapeNextPages = async (pages: number = 3) => {
    setScrapingPages(true)
    setError(null)

    try {
      const response = await fetch('/api/macupdate-category-scraper', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryUrl: categoryUrl.trim(),
          limit: 20,
          pages: pages
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Reload progress to show updated status
        await loadCategoryProgress()
      } else {
        setError(data.error || 'Failed to scrape pages')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape pages'
      setError(errorMessage)
    } finally {
      setScrapingPages(false)
    }
  }

  // Load progress on mount and when category URL changes
  useEffect(() => {
    if (categoryUrl.trim()) {
      loadCategoryProgress()
    }
  }, [categoryUrl])

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Category Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Enhanced control over MacUpdate category scraping and importing
      </Typography>

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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => scrapeNextPages(3)}
                disabled={scrapingPages}
                startIcon={scrapingPages ? <CircularProgress size={20} /> : <Download />}
              >
                {scrapingPages ? 'Scraping...' : 'Scrape Next 3 Pages'}
              </Button>
              
              <Button
                variant="contained"
                onClick={() => scrapeNextPages(5)}
                disabled={scrapingPages}
                startIcon={scrapingPages ? <CircularProgress size={20} /> : <Download />}
              >
                {scrapingPages ? 'Scraping...' : 'Scrape Next 5 Pages'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={loadCategoryProgress}
                disabled={loading}
                startIcon={<Refresh />}
              >
                Refresh Status
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
                        {page.appsImported} apps
                      </TableCell>
                      <TableCell>
                        {new Date(page.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {page.status === 'scraped' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => importPage(page.sessionId, page.pageNumber)}
                            disabled={importingPage === page.pageNumber}
                            startIcon={importingPage === page.pageNumber ? <CircularProgress size={16} /> : <Upload />}
                          >
                            {importingPage === page.pageNumber ? 'Importing...' : 'Import'}
                          </Button>
                        )}
                        {page.status === 'imported' && (
                          <Chip label="Imported" color="success" size="small" />
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
  )
} 