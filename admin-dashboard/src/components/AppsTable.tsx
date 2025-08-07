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
  Grid,
  Alert
} from '@mui/material'
import { Edit, Delete, Image as ImageIcon, Star, StarBorder, SelectAll, Apple as AppleIcon } from '@mui/icons-material'
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
  
  // iTunes matching state
  const [isItunesMatching, setIsItunesMatching] = useState(false)
  const [itunesResults, setItunesResults] = useState<any[]>([])
  const [itunesError, setItunesError] = useState<string | null>(null)

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    apps.forEach(app => {
      if (app.category?.name) {
        uniqueCategories.add(app.category.name)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [apps])

  // Use apps directly since filtering is handled by the dashboard
  const filteredApps = apps

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

  const handleItunesMatching = async () => {
    if (selectedApps.size === 0) {
      setItunesError('Please select apps to match')
      return
    }

    setIsItunesMatching(true)
    setItunesResults([])
    setItunesError(null)

    try {
      const response = await fetch('/api/itunes-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appIds: Array.from(selectedApps),
          autoApply: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start matching')
      }

      setItunesResults(data.results || [])
      console.log('iTunes matching completed:', data)

    } catch (err) {
      console.error('iTunes matching error:', err)
      setItunesError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsItunesMatching(false)
    }
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

  return (
    <>
      {/* iTunes Matching Error */}
      {itunesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {itunesError}
        </Alert>
      )}

      {/* iTunes Matching Results */}
      {itunesResults.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          iTunes matching completed. Found {itunesResults.filter(r => r.found).length} matches out of {itunesResults.length} apps.
        </Alert>
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