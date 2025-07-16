'use client'

import { Box, Typography, Paper, TextField, Button, Alert, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Category {
  id: string
  name: string
  slug: string
}

export default function SimpleAddAppPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [app, setApp] = useState({
    name: '',
    developer: '',
    description: '',
    price: '',
    website: '',
    downloadUrl: '',
    categoryId: '',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required fields
      if (!app.name || !app.developer) {
        throw new Error('App name and developer are required')
      }

      // Create app record
      const { data, error } = await supabase
        .from('apps')
        .insert([
          {
            name: app.name,
            developer: app.developer,
            description: app.description || null,
            price: parseFloat(app.price) || 0,
            website_url: app.website || null,
            download_url: app.downloadUrl || null,
            category_id: app.categoryId || null,
            is_on_mas: false,
            status: 'ACTIVE',
            source: 'CUSTOM',
          },
        ])
        .select()

      if (error) {
        console.error('App creation error:', error)
        throw new Error(error.message || 'Failed to create app')
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to create app')
      }

      setSuccess('App created successfully!')
      setApp({
        name: '',
        developer: '',
        description: '',
        price: '',
        website: '',
        downloadUrl: '',
        categoryId: '',
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create app')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Add New App (Simple)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a new app without image uploads for testing
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

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="App Name"
                variant="outlined"
                value={app.name}
                onChange={(e) => setApp({ ...app, name: e.target.value })}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Developer"
                variant="outlined"
                value={app.developer}
                onChange={(e) => setApp({ ...app, developer: e.target.value })}
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
                value={app.description}
                onChange={(e) => setApp({ ...app, description: e.target.value })}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price"
                variant="outlined"
                type="number"
                value={app.price}
                onChange={(e) => setApp({ ...app, price: e.target.value })}
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
                  value={app.categoryId}
                  label="Category"
                  onChange={(e) => setApp({ ...app, categoryId: e.target.value })}
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
                value={app.website}
                onChange={(e) => setApp({ ...app, website: e.target.value })}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Download URL"
                variant="outlined"
                type="url"
                value={app.downloadUrl}
                onChange={(e) => setApp({ ...app, downloadUrl: e.target.value })}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create App'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
} 