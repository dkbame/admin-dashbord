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
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/components/ThemeProvider'

interface Category {
  id: string
  name: string
  slug: string
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { mode, toggleColorMode } = useTheme()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
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
        newCategory.name.toLowerCase().replace(/\s+/g, '-')

      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.name.trim(), slug }])

      if (error) throw error

      setSuccess('Category added successfully')
      setNewCategory({ name: '', slug: '' })
      fetchCategories()
    } catch (err) {
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
      const { error } = await supabase
        .from('categories')
        .update({
          name: editingCategory.name,
          slug: editingCategory.slug,
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      setSuccess('Category updated successfully')
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
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
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Categories
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
                Add
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
                    primary={category.name}
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
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              System Preferences
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Dark Mode"
                  secondary="Toggle between light and dark theme"
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mode === 'dark'}
                        onChange={toggleColorMode}
                      />
                    }
                    label={mode === 'dark' ? 'On' : 'Off'}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Default Currency"
                  secondary="USD - United States Dollar"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Time Zone"
                  secondary="Automatically set by system"
                />
              </ListItem>
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              About
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              macOS App Discovery Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Version: 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © 2024 All rights reserved
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
              onClick={() => window.location.href = '/dashboard'}
            >
              View All Apps
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => window.location.href = '/dashboard/add'}
            >
              Add New App
            </Button>
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