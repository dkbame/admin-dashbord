'use client'

import { Box, Typography, Paper, Tabs, Tab, TextField, Button, Alert, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem, Card, CardContent } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { importFromMAS } from '@/lib/masImport'
import { uploadImage, uploadMultipleImages } from '@/lib/imageUpload'
import { supabase } from '@/lib/supabase'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

interface Category {
  id: string
  name: string
  slug: string
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`app-tabpanel-${index}`}
      aria-labelledby={`app-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AddAppPage() {
  const router = useRouter()
  const [tabValue, setTabValue] = useState(0)
  const [masUrl, setMasUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [customApp, setCustomApp] = useState({
    name: '',
    developer: '',
    description: '',
    price: '',
    website: '',
    downloadUrl: '',
    categoryId: '',
  })
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
      } else {
        setCategories(data || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setError(null)
    setSuccess(null)
  }

  const handleMasImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate URL format before importing
      if (!masUrl.trim()) {
        throw new Error('Please enter a Mac App Store URL')
      }

      const urlPattern = /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[^\/]+\/id\d+/
      if (!urlPattern.test(masUrl.trim())) {
        throw new Error('Invalid Mac App Store URL format. Please use a URL like: https://apps.apple.com/us/app/app-name/id123456789')
      }

      // Show progress message
      setSuccess('Importing app data...')

      const result = await importFromMAS(masUrl.trim())
      if (!result) {
        throw new Error('Failed to import app - no data returned')
      }

      setSuccess(`Successfully imported "${result.name}" by ${result.developer}`)
      setMasUrl('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import app'
      setError(errorMessage)
      
      // Clear any previous success message
      setSuccess(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Enhanced validation
      if (!customApp.name.trim()) {
        throw new Error('App name is required')
      }
      
      if (!customApp.developer.trim()) {
        throw new Error('Developer name is required')
      }

      // Validate URLs if provided
      if (customApp.website && !isValidUrl(customApp.website)) {
        throw new Error('Please enter a valid website URL')
      }

      if (customApp.downloadUrl && !isValidUrl(customApp.downloadUrl)) {
        throw new Error('Please enter a valid download URL')
      }

      // Validate price
      const price = parseFloat(customApp.price)
      if (customApp.price && (isNaN(price) || price < 0)) {
        throw new Error('Please enter a valid price (0 or greater)')
      }

      // Show progress message
      setSuccess('Creating app...')

      // Create app record first to get the ID
      const { data: app, error: appError } = await supabase
        .from('apps')
        .insert([
          {
            name: customApp.name.trim(),
            developer: customApp.developer.trim(),
            description: customApp.description.trim() || null,
            price: price || 0,
            website_url: customApp.website.trim() || null,
            download_url: customApp.downloadUrl.trim() || null,
            category_id: customApp.categoryId || null,
            is_on_mas: false,
            status: 'ACTIVE',
            source: 'CUSTOM',
            is_free: price === 0,
          },
        ])
        .select()

      if (appError) {
        console.error('App creation error:', appError)
        
        // Handle specific database errors
        if (appError.code === '23505') {
          throw new Error('An app with this name already exists')
        } else if (appError.code === '23502') {
          throw new Error('Required fields are missing')
        } else {
          throw new Error(appError.message || 'Failed to create app')
        }
      }

      if (!app || app.length === 0) {
        throw new Error('Failed to create app')
      }

      const appId = app[0].id

      // Upload icon if provided
      if (iconFile) {
        try {
          setSuccess('Uploading icon...')
          const iconUrl = await uploadImage(iconFile, 'icons', appId)
          if (iconUrl) {
            await supabase
              .from('apps')
              .update({ icon_url: iconUrl })
              .eq('id', appId)
          }
        } catch (uploadError) {
          console.error('Icon upload error:', uploadError)
          // Continue without icon if upload fails
        }
      }

      // Upload screenshots if provided
      if (screenshotFiles.length > 0) {
        try {
          setSuccess('Uploading screenshots...')
          const screenshotUrls = await uploadMultipleImages(
            screenshotFiles,
            'screenshots',
            appId
          )
          if (screenshotUrls.length > 0) {
            const screenshotsToInsert = screenshotUrls.map((url, index) => ({
              app_id: appId,
              url,
              display_order: index + 1,
            }))
            await supabase.from('screenshots').insert(screenshotsToInsert)
          }
        } catch (uploadError) {
          console.error('Screenshot upload error:', uploadError)
          // Continue without screenshots if upload fails
        }
      }

      setSuccess(`Successfully created "${customApp.name}" by ${customApp.developer}`)
      
      // Reset form
      setCustomApp({
        name: '',
        developer: '',
        description: '',
        price: '',
        website: '',
        downloadUrl: '',
        categoryId: '',
      })
      setIconFile(null)
      setScreenshotFiles([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit app'
      setError(errorMessage)
      setSuccess(null)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to validate URLs
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIconFile(e.target.files[0])
    }
  }

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setScreenshotFiles(Array.from(e.target.files))
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Add New App
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
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="app source tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Mac App Store Import" />
          <Tab label="Custom App" />
          <Tab label="MacUpdate Import" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleMasImport}>
            <TextField
              fullWidth
              label="Mac App Store URL"
              variant="outlined"
              value={masUrl}
              onChange={(e) => setMasUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/..."
              sx={{ mb: 2 }}
              disabled={loading}
            />
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!masUrl || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Import App'}
            </Button>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handleCustomSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="App Name"
                  variant="outlined"
                  value={customApp.name}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, name: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Developer"
                  variant="outlined"
                  value={customApp.developer}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, developer: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  variant="outlined"
                  multiline
                  rows={4}
                  value={customApp.description}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, description: e.target.value })
                  }
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  variant="outlined"
                  type="number"
                  value={customApp.price}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, price: e.target.value })
                  }
                  InputProps={{
                    startAdornment: '$',
                  }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={customApp.categoryId}
                    label="Category"
                    onChange={(e) =>
                      setCustomApp({ ...customApp, categoryId: e.target.value })
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  variant="outlined"
                  type="url"
                  value={customApp.website}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, website: e.target.value })
                  }
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Download URL"
                  variant="outlined"
                  type="url"
                  value={customApp.downloadUrl}
                  onChange={(e) =>
                    setCustomApp({ ...customApp, downloadUrl: e.target.value })
                  }
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="icon-file"
                  type="file"
                  onChange={handleIconChange}
                  disabled={loading}
                />
                <label htmlFor="icon-file">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    disabled={loading}
                  >
                    Upload Icon
                  </Button>
                </label>
                {iconFile && (
                  <Typography variant="caption" display="block">
                    Selected: {iconFile.name}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="screenshots-file"
                  type="file"
                  multiple
                  onChange={handleScreenshotsChange}
                  disabled={loading}
                />
                <label htmlFor="screenshots-file">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    disabled={loading}
                  >
                    Upload Screenshots
                  </Button>
                </label>
                {screenshotFiles.length > 0 && (
                  <Typography variant="caption" display="block">
                    Selected: {screenshotFiles.length} files
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit App'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Single App from MacUpdate
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use our dedicated single app import tool to scrape and import apps from MacUpdate URLs 
                with complete details including screenshots, descriptions, and metadata.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/dashboard/add/single-app')}
                sx={{ mt: 2 }}
              >
                Open Single App Import Tool
              </Button>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
    </Box>
  )
} 