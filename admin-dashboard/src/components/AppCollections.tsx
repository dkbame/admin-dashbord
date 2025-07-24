'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Collections as CollectionsIcon
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface App {
  id: string
  name: string
  developer: string
  category: { name: string }
  icon_url: string | null
  is_featured: boolean | null
}

interface Collection {
  id: string
  name: string
  description: string
  slug: string
  is_featured: boolean
  created_at: string
  apps: CollectionApp[]
}

interface CollectionApp {
  id: string
  collection_id: string
  app_id: string
  display_order: number
  app: App
}

interface AppCollectionsProps {
  apps: App[]
}

export default function AppCollections({ apps }: AppCollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [selectedApps, setSelectedApps] = useState<App[]>([])
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    description: '',
    slug: '',
    is_featured: false
  })

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          apps:collection_apps(
            id,
            display_order,
            app:apps(
              id,
              name,
              developer,
              category:categories(name),
              icon_url,
              is_featured
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to match our interface
      const transformedCollections = (data || []).map(collection => ({
        ...collection,
        apps: (collection.apps || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((ca: any) => ({
            id: ca.id,
            collection_id: ca.collection_id,
            app_id: ca.app_id,
            display_order: ca.display_order,
            app: ca.app
          }))
      }))

      setCollections(transformedCollections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    try {
      setError(null)

      // Generate slug if not provided
      const slug = collectionForm.slug || 
        collectionForm.name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')

      // Create collection
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert([{
          name: collectionForm.name,
          description: collectionForm.description,
          slug,
          is_featured: collectionForm.is_featured
        }])
        .select()
        .single()

      if (collectionError) throw collectionError

      // Add selected apps to collection
      if (selectedApps.length > 0) {
        const collectionApps = selectedApps.map((app, index) => ({
          collection_id: collection.id,
          app_id: app.id,
          display_order: index + 1
        }))

        const { error: appsError } = await supabase
          .from('collection_apps')
          .insert(collectionApps)

        if (appsError) throw appsError
      }

      setDialogOpen(false)
      resetForm()
      fetchCollections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection')
    }
  }

  const handleUpdateCollection = async () => {
    if (!editingCollection) return

    try {
      setError(null)

      // Update collection
      const { error: collectionError } = await supabase
        .from('collections')
        .update({
          name: collectionForm.name,
          description: collectionForm.description,
          slug: collectionForm.slug,
          is_featured: collectionForm.is_featured
        })
        .eq('id', editingCollection.id)

      if (collectionError) throw collectionError

      // Update apps in collection
      if (selectedApps.length > 0) {
        // Remove existing apps
        await supabase
          .from('collection_apps')
          .delete()
          .eq('collection_id', editingCollection.id)

        // Add new apps
        const collectionApps = selectedApps.map((app, index) => ({
          collection_id: editingCollection.id,
          app_id: app.id,
          display_order: index + 1
        }))

        const { error: appsError } = await supabase
          .from('collection_apps')
          .insert(collectionApps)

        if (appsError) throw appsError
      }

      setDialogOpen(false)
      resetForm()
      fetchCollections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      // Delete collection apps first
      await supabase
        .from('collection_apps')
        .delete()
        .eq('collection_id', collectionId)

      // Delete collection
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)

      if (error) throw error

      fetchCollections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection')
    }
  }

  const openCreateDialog = () => {
    setEditingCollection(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection)
    setCollectionForm({
      name: collection.name,
      description: collection.description,
      slug: collection.slug,
      is_featured: collection.is_featured
    })
    setSelectedApps(collection.apps.map(ca => ca.app))
    setDialogOpen(true)
  }

  const resetForm = () => {
    setCollectionForm({
      name: '',
      description: '',
      slug: '',
      is_featured: false
    })
    setSelectedApps([])
    setEditingCollection(null)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          App Collections
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{ borderRadius: '20px', px: 3 }}
        >
          Create Collection
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {collections.map((collection) => (
          <Grid item xs={12} md={6} lg={4} key={collection.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {collection.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {collection.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={`${collection.apps.length} apps`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {collection.is_featured && (
                        <Chip
                          label="Featured"
                          size="small"
                          color="warning"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(collection)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <List dense>
                  {collection.apps.slice(0, 3).map((collectionApp) => (
                    <ListItem key={collectionApp.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={collectionApp.app.name}
                        secondary={collectionApp.app.developer}
                      />
                    </ListItem>
                  ))}
                  {collection.apps.length > 3 && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={`+${collection.apps.length - 3} more apps`}
                        sx={{ fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Collection Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCollection ? 'Edit Collection' : 'Create New Collection'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Collection Name"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={collectionForm.description}
                onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Slug"
                value={collectionForm.slug}
                onChange={(e) => setCollectionForm({ ...collectionForm, slug: e.target.value })}
                helperText="URL-friendly identifier"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Featured Status</InputLabel>
                <Select
                  value={collectionForm.is_featured}
                  label="Featured Status"
                  onChange={(e) => setCollectionForm({ ...collectionForm, is_featured: e.target.value as boolean })}
                >
                  <MenuItem value={false}>Not Featured</MenuItem>
                  <MenuItem value={true}>Featured</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Apps in Collection
              </Typography>
              <Autocomplete
                multiple
                options={apps}
                getOptionLabel={(option) => `${option.name} by ${option.developer}`}
                value={selectedApps}
                onChange={(_, newValue) => setSelectedApps(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Apps"
                    placeholder="Search apps..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {option.developer}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
            variant="contained"
            disabled={!collectionForm.name || selectedApps.length === 0}
          >
            {editingCollection ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 