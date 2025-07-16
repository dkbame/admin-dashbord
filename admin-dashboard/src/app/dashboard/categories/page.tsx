'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Apps as AppsIcon,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface Category {
  id: string
  name: string
  slug: string
  _count?: {
    apps: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      // First, get all categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError

      // Then, for each category, count the number of apps
      const categoriesWithCounts = await Promise.all(
        (categories || []).map(async (category) => {
          const { count, error: countError } = await supabase
            .from('apps')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)

          if (countError) throw countError

          return {
            ...category,
            _count: {
              apps: count || 0,
            },
          }
        })
      )

      setCategories(categoriesWithCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return

    try {
      setError(null)
      const slug = newCategory.slug.trim() || 
        newCategory.name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

      console.log('Attempting to create category:', { name: newCategory.name.trim(), slug })

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.name.trim(), slug }])
        .select()

      console.log('Category creation response:', { data, error })

      if (error) {
        console.error('Category creation error:', error)
        throw error
      }

      setSuccess('Category added successfully')
      setNewCategory({ name: '', slug: '' })
      fetchCategories()
    } catch (err) {
      console.error('Error in handleAddCategory:', err)
      setError(err instanceof Error ? err.message : 'Failed to add category')
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    try {
      setError(null)
      
      // Clean up the slug similar to creation
      const cleanSlug = editingCategory.slug.trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

      const updateData = {
        name: editingCategory.name.trim(),
        slug: cleanSlug,
      }

      console.log('Attempting to update category:', { id: editingCategory.id, ...updateData })

      const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', editingCategory.id)
        .select()

      console.log('Category update response:', { data, error })

      if (error) {
        console.error('Category update error:', error)
        throw error
      }

      setSuccess('Category updated successfully')
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
      console.error('Error in handleUpdateCategory:', err)
      setError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Category deleted successfully')
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Categories
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
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

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                label="Category Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                label="Slug (optional)"
                value={newCategory.slug}
                onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCategory}
                disabled={!newCategory.name.trim()}
              >
                Add Category
              </Button>
            </Box>

            <List>
              {categories.map((category) => (
                <ListItem
                  key={category.id}
                  divider
                  sx={{
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {category.name}
                        <Chip
                          size="small"
                          label={`${category._count?.apps || 0} apps`}
                          icon={<AppsIcon sx={{ fontSize: '1rem !important' }} />}
                        />
                      </Box>
                    }
                    secondary={`Slug: ${category.slug}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditCategory(category)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={category._count?.apps ? category._count.apps > 0 : false}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Category Guidelines
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Use clear, descriptive names
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Keep slugs simple and URL-friendly
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Categories with apps cannot be deleted
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Reassign apps before deleting categories
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Stats
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Total Categories: {categories.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Categories in Use: {categories.filter(c => c._count?.apps && c._count.apps > 0).length}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={editingCategory?.name || ''}
            onChange={(e) =>
              setEditingCategory(
                editingCategory
                  ? { ...editingCategory, name: e.target.value }
                  : null
              )
            }
          />
          <TextField
            margin="dense"
            label="Slug"
            fullWidth
            value={editingCategory?.slug || ''}
            onChange={(e) =>
              setEditingCategory(
                editingCategory
                  ? { ...editingCategory, slug: e.target.value }
                  : null
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateCategory} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 