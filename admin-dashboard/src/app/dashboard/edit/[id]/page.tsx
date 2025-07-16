'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  FormControlLabel,
  Switch,
  Card,
  CardMedia,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { uploadImage, uploadMultipleImages } from '@/lib/imageUpload'

interface Category {
  id: string
  name: string
}

interface Screenshot {
  id: string
  url: string
  caption: string
  display_order: number
}

interface App {
  id: string
  name: string
  developer: string
  description: string
  category_id: string
  price: number
  currency: string
  is_on_mas: boolean
  mas_id?: string
  mas_url?: string
  download_url?: string
  website_url?: string
  icon_url?: string
  minimum_os_version?: string
  features: string[]
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
  screenshots: Screenshot[]
}

export default function EditAppPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [app, setApp] = useState<App | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newIconFile, setNewIconFile] = useState<File | null>(null)
  const [newScreenshotFiles, setNewScreenshotFiles] = useState<File[]>([])
  const [newFeature, setNewFeature] = useState('')

  useEffect(() => {
    fetchApp()
    fetchCategories()
  }, [])

  const fetchApp = async () => {
    try {
      console.log('Fetching app with ID:', params.id);
      
      const { data: app, error } = await supabase
        .from('apps')
        .select(`
          *,
          screenshots!screenshots_app_id_fkey (
            id,
            url,
            caption,
            display_order
          )
        `)
        .eq('id', params.id)
        .single()

      console.log('Fetch app response:', { app, error });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error
      }
      
      if (!app) {
        console.error('No app found with ID:', params.id);
        throw new Error('App not found')
      }

      console.log('App fetched successfully:', app);
      setApp(app)
    } catch (err) {
      console.error('Error in fetchApp:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch app')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (data) setCategories(data)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!app) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Upload new icon if provided
      let updatedIconUrl = app.icon_url
      if (newIconFile) {
        const iconUrl = await uploadImage(newIconFile, 'icons', app.id)
        if (iconUrl) updatedIconUrl = iconUrl
      }

      // Upload new screenshots if provided
      if (newScreenshotFiles.length > 0) {
        const screenshotUrls = await uploadMultipleImages(
          newScreenshotFiles,
          'screenshots',
          app.id
        )
        const currentMaxOrder = Math.max(
          ...(app.screenshots || []).map((s) => s.display_order),
          0
        )
        const newScreenshots = screenshotUrls.map((url, index) => ({
          app_id: app.id,
          url,
          display_order: currentMaxOrder + index + 1,
        }))
        await supabase.from('screenshots').insert(newScreenshots)
      }

      // Update app details
      console.log('Updating app with data:', {
        name: app.name,
        developer: app.developer,
        description: app.description,
        category_id: app.category_id,
        price: app.price,
        currency: app.currency,
        is_on_mas: app.is_on_mas,
        mas_id: app.mas_id,
        mas_url: app.mas_url,
        download_url: app.download_url,
        website_url: app.website_url,
        icon_url: updatedIconUrl,
        minimum_os_version: app.minimum_os_version,
        features: app.features,
        status: app.status,
      });

      // First, let's check if the category exists
      console.log('Checking if category exists:', app.category_id);
      const { data: categoryCheck, error: categoryError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('id', app.category_id)
        .single();
      
      console.log('Category check:', { categoryCheck, categoryError });

      // Get the current app data to compare
      const { data: currentApp, error: currentError } = await supabase
        .from('apps')
        .select('*')
        .eq('id', app.id)
        .single();
      
      console.log('Current app data category_id:', currentApp?.category_id);
      console.log('New app data category_id:', app.category_id);
      console.log('Current app data:', currentApp);
      console.log('New app data to update:', {
        name: app.name,
        developer: app.developer,
        description: app.description,
        category_id: app.category_id,
        price: app.price,
        currency: app.currency,
        is_on_mas: app.is_on_mas,
        mas_id: app.mas_id,
        mas_url: app.mas_url,
        download_url: app.download_url,
        website_url: app.website_url,
        icon_url: updatedIconUrl,
        minimum_os_version: app.minimum_os_version,
        features: app.features,
        status: app.status,
      });

      const { data: updateData, error: updateError } = await supabase
        .from('apps')
        .update({
          name: app.name,
          developer: app.developer,
          description: app.description,
          category_id: app.category_id,
          price: app.price,
          currency: app.currency,
          is_on_mas: app.is_on_mas,
          mas_id: app.mas_id,
          mas_url: app.mas_url,
          download_url: app.download_url,
          website_url: app.website_url,
          icon_url: updatedIconUrl,
          minimum_os_version: app.minimum_os_version,
          features: app.features,
          status: app.status,
        })
        .eq('id', app.id)
        .select()

      console.log('Update response:', { updateData, updateError });

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError
      }

      setSuccess('App updated successfully')
      console.log('About to refresh app data...')
      fetchApp() // Refresh data
      setNewIconFile(null)
      setNewScreenshotFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update app')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteScreenshot = async (screenshotId: string) => {
    if (!app) return

    try {
      const { error } = await supabase
        .from('screenshots')
        .delete()
        .eq('id', screenshotId)

      if (error) throw error

      setApp({
        ...app,
        screenshots: app.screenshots.filter((s) => s.id !== screenshotId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete screenshot')
    }
  }

  const handleAddFeature = () => {
    if (!app || !newFeature.trim()) return
    setApp({
      ...app,
      features: [...app.features, newFeature.trim()],
    })
    setNewFeature('')
  }

  const handleRemoveFeature = (index: number) => {
    if (!app) return
    const newFeatures = [...app.features]
    newFeatures.splice(index, 1)
    setApp({ ...app, features: newFeatures })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!app) {
    return (
      <Alert severity="error">App not found</Alert>
    )
  }

  return (
    <Box component="form" onSubmit={handleSave}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Edit App
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="App Name"
                  value={app.name}
                  onChange={(e) => setApp({ ...app, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Developer"
                  value={app.developer}
                  onChange={(e) => setApp({ ...app, developer: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={app.category_id || ''}
                    label="Category"
                    onChange={(e) => {
                      console.log('Category changed from:', app.category_id, 'to:', e.target.value);
                      setApp({ ...app, category_id: e.target.value });
                    }}
                  >
                    {(categories || []).map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={app.description}
                  onChange={(e) => setApp({ ...app, description: e.target.value })}
                  required
                />
              </Grid>
            </Grid>
          </Card>

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Pricing & Distribution
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={app.price}
                  onChange={(e) => setApp({ ...app, price: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: '$',
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={app.currency}
                  onChange={(e) => setApp({ ...app, currency: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={app.is_on_mas}
                      onChange={(e) => setApp({ ...app, is_on_mas: e.target.checked })}
                    />
                  }
                  label="Available on Mac App Store"
                />
              </Grid>
              {app.is_on_mas && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mac App Store ID"
                      value={app.mas_id || ''}
                      onChange={(e) => setApp({ ...app, mas_id: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mac App Store URL"
                      value={app.mas_url || ''}
                      onChange={(e) => setApp({ ...app, mas_url: e.target.value })}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website URL"
                  value={app.website_url || ''}
                  onChange={(e) => setApp({ ...app, website_url: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Download URL"
                  value={app.download_url || ''}
                  onChange={(e) => setApp({ ...app, download_url: e.target.value })}
                />
              </Grid>
            </Grid>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Technical Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum macOS Version"
                  value={app.minimum_os_version || ''}
                  onChange={(e) => setApp({ ...app, minimum_os_version: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={app.status}
                    label="Status"
                    onChange={(e) => setApp({ ...app, status: e.target.value as App['status'] })}
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Features</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {(app.features || []).map((feature, index) => (
                    <Chip
                      key={index}
                      label={feature}
                      onDelete={() => handleRemoveFeature(index)}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddFeature()
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddFeature}
                    disabled={!newFeature.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              App Icon
            </Typography>
            {app.icon_url && (
              <CardMedia
                component="img"
                image={app.icon_url}
                alt={app.name}
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 2,
                  mb: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              />
            )}
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="icon-upload"
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setNewIconFile(e.target.files[0])
                }
              }}
            />
            <label htmlFor="icon-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
              >
                {app.icon_url ? 'Change Icon' : 'Upload Icon'}
              </Button>
            </label>
            {newIconFile && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                New icon selected: {newIconFile.name}
              </Typography>
            )}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Screenshots
            </Typography>
            <ImageList cols={2} gap={8}>
              {(app.screenshots || []).map((screenshot) => (
                <ImageListItem key={screenshot.id}>
                  <img
                    src={screenshot.url}
                    alt={screenshot.caption || `Screenshot ${screenshot.display_order}`}
                    loading="lazy"
                    style={{
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <ImageListItemBar
                    position="top"
                    actionIcon={
                      <IconButton
                        sx={{ color: 'white' }}
                        onClick={() => handleDeleteScreenshot(screenshot.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                    actionPosition="right"
                  />
                </ImageListItem>
              ))}
            </ImageList>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="screenshots-upload"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setNewScreenshotFiles(Array.from(e.target.files))
                }
              }}
            />
            <label htmlFor="screenshots-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
              >
                Add Screenshots
              </Button>
            </label>
            {newScreenshotFiles.length > 0 && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {newScreenshotFiles.length} new screenshots selected
              </Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
} 