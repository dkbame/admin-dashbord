'use client'

import { 
  Box, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button,
  Typography,
  Chip
} from '@mui/material'
import { Search, Clear } from '@mui/icons-material'
import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
}

interface FilterControlsProps {
  selectedCategory: string
  searchTerm: string
  onCategoryChange: (category: string) => void
  onSearchChange: (search: string) => void
  onClearFilters: () => void
}

export default function FilterControls({
  selectedCategory,
  searchTerm,
  onCategoryChange,
  onSearchChange,
  onClearFilters
}: FilterControlsProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Fetch categories for the dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        if (response.ok) {
          setCategories(data)
        } else {
          console.error('Failed to fetch categories:', data.error)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        onSearchChange(localSearchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchTerm, searchTerm, onSearchChange])

  const handleClearFilters = () => {
    setLocalSearchTerm('')
    onCategoryChange('all')
    onSearchChange('')
    onClearFilters()
  }

  const hasActiveFilters = selectedCategory !== 'all' || searchTerm !== ''

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 2, 
      p: 2, 
      borderBottom: 1, 
      borderColor: 'divider',
      backgroundColor: 'background.paper'
    }}>
      {/* Search field */}
      <TextField
        size="small"
        placeholder="Search apps..."
        value={localSearchTerm}
        onChange={(e) => setLocalSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
        }}
        sx={{ minWidth: { xs: '100%', sm: 250 } }}
      />

      {/* Category filter */}
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={selectedCategory}
          label="Category"
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={loading}
        >
          <MenuItem value="all">All Categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.name}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Active filters display */}
      {hasActiveFilters && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Active filters:
          </Typography>
          {selectedCategory !== 'all' && (
            <Chip 
              label={`Category: ${selectedCategory}`} 
              size="small" 
              onDelete={() => onCategoryChange('all')}
            />
          )}
          {searchTerm && (
            <Chip 
              label={`Search: "${searchTerm}"`} 
              size="small" 
              onDelete={() => {
                setLocalSearchTerm('')
                onSearchChange('')
              }}
            />
          )}
        </Box>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          size="small"
          startIcon={<Clear />}
          onClick={handleClearFilters}
          variant="outlined"
          sx={{ ml: 'auto' }}
        >
          Clear Filters
        </Button>
      )}
    </Box>
  )
} 