'use client'

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  IconButton, 
  Avatar, 
  Switch, 
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  ImageList,
  ImageListItem,
  Typography,
  Checkbox,
  Box,
  Button,
  Toolbar,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import { Edit, Delete, Image as ImageIcon, Star, StarBorder, SelectAll, Clear, FilterList, Search } from '@mui/icons-material'
import { useState, useMemo } from 'react'

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
  category: { name: string }
  price: string | number | null
  is_on_mas: boolean
  status: string
  icon_url: string | null
  screenshots: Screenshot[]
  is_featured: boolean | null
  is_free: boolean | null
}

interface AppsTableProps {
  apps: App[]
  onEdit: (appId: string) => void
  onDelete: (app: App) => void
  onToggleFeatured: (appId: string, currentFeatured: boolean) => void
  updatingFeatured: string | null
  onBulkDelete?: (appIds: string[]) => void
  onBulkToggleFeatured?: (appIds: string[], featured: boolean) => void
}

interface FilterState {
  search: string
  category: string
  priceRange: string
  status: string
  source: string
  featured: string
}

// Note: VirtualizedAppsTable is available for performance optimization with large datasets
// Import it when needed: import VirtualizedAppsTable from './VirtualizedAppsTable'
export default function AppsTable({ 
  apps, 
  onEdit, 
  onDelete, 
  onToggleFeatured, 
  updatingFeatured,
  onBulkDelete,
  onBulkToggleFeatured
}: AppsTableProps) {
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [screenshotsOpen, setScreenshotsOpen] = useState(false)
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    priceRange: '',
    status: '',
    source: '',
    featured: ''
  })

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = new Set(apps.map(app => app.category?.name).filter(Boolean))
    return Array.from(uniqueCategories).sort()
  }, [apps])

  // Filter apps based on current filters
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          app.name.toLowerCase().includes(searchLower) ||
          app.developer.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.category && app.category?.name !== filters.category) {
        return false
      }

      // Price range filter
      if (filters.priceRange) {
        const price = parseFloat(String(app.price || 0))
        switch (filters.priceRange) {
          case 'free':
            if (price !== 0) return false
            break
          case 'paid':
            if (price === 0) return false
            break
          case 'under5':
            if (price >= 5) return false
            break
          case 'under10':
            if (price >= 10) return false
            break
          case 'over10':
            if (price < 10) return false
            break
        }
      }

      // Status filter
      if (filters.status && app.status !== filters.status) {
        return false
      }

      // Source filter
      if (filters.source) {
        if (filters.source === 'mas' && !app.is_on_mas) return false
        if (filters.source === 'custom' && app.is_on_mas) return false
      }

      // Featured filter
      if (filters.featured) {
        if (filters.featured === 'featured' && !app.is_featured) return false
        if (filters.featured === 'not-featured' && app.is_featured) return false
      }

      return true
    })
  }, [apps, filters])

  const handleOpenScreenshots = (app: App) => {
    setSelectedApp(app)
    setScreenshotsOpen(true)
  }

  const handleSelectApp = (appId: string) => {
    const newSelected = new Set(selectedApps)
    if (newSelected.has(appId)) {
      newSelected.delete(appId)
    } else {
      newSelected.add(appId)
    }
    setSelectedApps(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set())
    } else {
      setSelectedApps(new Set(filteredApps.map(app => app.id)))
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedApps.size > 0) {
      onBulkDelete(Array.from(selectedApps))
      setSelectedApps(new Set())
    }
  }

  const handleBulkToggleFeatured = (featured: boolean) => {
    if (onBulkToggleFeatured && selectedApps.size > 0) {
      onBulkToggleFeatured(Array.from(selectedApps), featured)
      setSelectedApps(new Set())
    }
  }

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      priceRange: '',
      status: '',
      source: '',
      featured: ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'INACTIVE':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatPrice = (price: string | number | null) => {
    if (price === '0' || price === '' || price === null || price === 0) {
      return (
        <Chip
          label="Free"
          color="success"
          size="small"
          sx={{ minWidth: 60 }}
        />
      )
    }
    return <span>${String(price || '0.00')}</span>
  }

  const activeFiltersCount = Object.values(filters).filter(f => f !== '').length

  return (
    <>
      {/* Filters Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Search apps or developers..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <Button
              variant={filtersOpen ? "contained" : "outlined"}
              startIcon={<FilterList />}
              onClick={() => setFiltersOpen(!filtersOpen)}
              size="small"
            >
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="text"
                onClick={clearFilters}
                size="small"
                color="error"
              >
                Clear All
              </Button>
            )}
          </Box>

          <Collapse in={filtersOpen}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Price</InputLabel>
                  <Select
                    value={filters.priceRange}
                    label="Price"
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  >
                    <MenuItem value="">All Prices</MenuItem>
                    <MenuItem value="free">Free</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="under5">Under $5</MenuItem>
                    <MenuItem value="under10">Under $10</MenuItem>
                    <MenuItem value="over10">Over $10</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={filters.source}
                    label="Source"
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  >
                    <MenuItem value="">All Sources</MenuItem>
                    <MenuItem value="mas">Mac App Store</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Featured</InputLabel>
                  <Select
                    value={filters.featured}
                    label="Featured"
                    onChange={(e) => handleFilterChange('featured', e.target.value)}
                  >
                    <MenuItem value="">All Apps</MenuItem>
                    <MenuItem value="featured">Featured Only</MenuItem>
                    <MenuItem value="not-featured">Not Featured</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredApps.length} of {apps.length} apps
          {activeFiltersCount > 0 && ` (filtered)`}
        </Typography>
      </Box>

      {/* Bulk Actions Toolbar */}
      {selectedApps.size > 0 && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 1,
            mb: 2
          }}
        >
          <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
            {selectedApps.size} app{selectedApps.size !== 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Mark as Featured">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkToggleFeatured(true)}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Star sx={{ mr: 0.5 }} />
                Featured
              </Button>
            </Tooltip>
            <Tooltip title="Remove from Featured">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkToggleFeatured(false)}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <StarBorder sx={{ mr: 0.5 }} />
                Unfeature
              </Button>
            </Tooltip>
            <Tooltip title="Delete Selected">
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={handleBulkDelete}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Delete sx={{ mr: 0.5 }} />
                Delete
              </Button>
            </Tooltip>
            <Tooltip title="Clear Selection">
              <IconButton
                size="small"
                onClick={() => setSelectedApps(new Set())}
                sx={{ color: 'white' }}
              >
                <Clear />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      )}

      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="apps table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedApps.size > 0 && selectedApps.size < filteredApps.length}
                  checked={filteredApps.length > 0 && selectedApps.size === filteredApps.length}
                  onChange={handleSelectAll}
                  icon={<SelectAll />}
                />
              </TableCell>
              <TableCell>App</TableCell>
              <TableCell>Developer</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Featured</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApps.map((app) => (
              <TableRow
                key={app.id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { backgroundColor: 'background.subtle' },
                  ...(selectedApps.has(app.id) && {
                    backgroundColor: 'action.selected',
                    '&:hover': { backgroundColor: 'action.selected' }
                  })
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedApps.has(app.id)}
                    onChange={() => handleSelectApp(app.id)}
                  />
                </TableCell>
                <TableCell 
                  component="th" 
                  scope="row" 
                  sx={{ 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  {app.icon_url ? (
                    <Avatar
                      src={app.icon_url}
                      alt={app.name}
                      sx={{ 
                        width: 40, 
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        border: 1,
                        borderColor: 'divider'
                      }}
                    />
                  ) : (
                    <Avatar
                      sx={{ 
                        width: 40, 
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        border: 1,
                        borderColor: 'divider'
                      }}
                    >
                      {app.name.charAt(0)}
                    </Avatar>
                  )}
                  <span>{app.name}</span>
                </TableCell>
                <TableCell>{app.developer}</TableCell>
                <TableCell>{app.category?.name || 'Uncategorized'}</TableCell>
                <TableCell>
                  {formatPrice(app.price)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={app.is_on_mas ? 'Mac App Store' : 'Custom'}
                    color={app.is_on_mas ? 'primary' : 'secondary'}
                    size="small"
                    sx={{ minWidth: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={app.status}
                    color={getStatusColor(app.status) as any}
                    size="small"
                    sx={{ minWidth: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={app.is_featured || false}
                        onChange={() => onToggleFeatured(app.id, app.is_featured || false)}
                        disabled={updatingFeatured === app.id}
                        icon={<StarBorder />}
                        checkedIcon={<Star />}
                      />
                    }
                    label=""
                  />
                </TableCell>
                <TableCell align="right">
                  {app.screenshots?.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenScreenshots(app)}
                      sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
                    >
                      <ImageIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onEdit(app.id)}
                    sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(app)}
                    sx={{ '&:hover': { color: 'error.main' } }}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Screenshots Dialog */}
      <Dialog
        open={screenshotsOpen}
        onClose={() => setScreenshotsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Screenshots - {selectedApp?.name}
        </DialogTitle>
        <DialogContent>
          {selectedApp?.screenshots && selectedApp.screenshots.length > 0 ? (
            <ImageList cols={2} gap={8}>
              {selectedApp.screenshots.map((screenshot) => (
                <ImageListItem key={screenshot.id}>
                  <img
                    src={screenshot.url}
                    alt={screenshot.caption || `Screenshot ${screenshot.display_order}`}
                    loading="lazy"
                    style={{ borderRadius: 8 }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Typography color="text.secondary">
              No screenshots available
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 