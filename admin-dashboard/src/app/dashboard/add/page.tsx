'use client'

import { Box, Typography, Paper, Tabs, Tab, TextField, Button, Alert, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
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
      const result = await importFromMAS(masUrl)
      if (!result) {
        throw new Error('Failed to import app')
      }
      setSuccess('App imported successfully')
      setMasUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import app')
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
      // Validate required fields
      if (!customApp.name || !customApp.developer) {
        throw new Error('App name and developer are required')
      }

      // Create app record first to get the ID
      const { data: app, error: appError } = await supabase
        .from('apps')
        .insert([
          {
            name: customApp.name,
            developer: customApp.developer,
            description: customApp.description || null,
            price: parseFloat(customApp.price) || 0,
            website_url: customApp.website || null,
            download_url: customApp.downloadUrl || null,
            category_id: customApp.categoryId || null,
            is_on_mas: false,
            status: 'ACTIVE',
            source: 'CUSTOM',
          },
        ])
        .select()

      if (appError) {
        console.error('App creation error:', appError)
        throw new Error(appError.message || 'Failed to create app')
      }

      if (!app || app.length === 0) {
        throw new Error('Failed to create app')
      }

      const appId = app[0].id

      // Upload icon if provided
      if (iconFile) {
        try {
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

      setSuccess('App submitted successfully')
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
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit app')
    } finally {
      setLoading(false)
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
      </Paper>
    </Box>
  )
} 