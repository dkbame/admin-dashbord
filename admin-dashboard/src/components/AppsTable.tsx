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
  Typography
} from '@mui/material'
import { Edit, Delete, Image as ImageIcon, Star, StarBorder } from '@mui/icons-material'
import { useState } from 'react'

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
}

export default function AppsTable({ 
  apps, 
  onEdit, 
  onDelete, 
  onToggleFeatured, 
  updatingFeatured 
}: AppsTableProps) {
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [screenshotsOpen, setScreenshotsOpen] = useState(false)

  const handleOpenScreenshots = (app: App) => {
    setSelectedApp(app)
    setScreenshotsOpen(true)
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
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="apps table">
          <TableHead>
            <TableRow>
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
            {apps.map((app) => (
              <TableRow
                key={app.id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { backgroundColor: 'background.subtle' },
                }}
              >
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
                      <ImageIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onEdit(app.id)}
                    sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => onDelete(app)}
                    sx={{ '&:hover': { backgroundColor: 'error.main', color: 'white' } }}
                  >
                    <Delete fontSize="small" />
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
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedApp?.name} Screenshots
        </DialogTitle>
        <DialogContent>
          {selectedApp?.screenshots && selectedApp.screenshots.length > 0 ? (
            <ImageList cols={2} gap={16} sx={{ mt: 2 }}>
              {selectedApp.screenshots
                .sort((a, b) => a.display_order - b.display_order)
                .map((screenshot) => (
                  <ImageListItem key={screenshot.id}>
                    <img
                      src={screenshot.url}
                      alt={screenshot.caption || `${selectedApp.name} screenshot`}
                      loading="lazy"
                      style={{ 
                        width: '100%',
                        height: 'auto',
                        borderRadius: 8,
                        border: '1px solid rgba(0, 0, 0, 0.12)'
                      }}
                    />
                    {screenshot.caption && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        {screenshot.caption}
                      </Typography>
                    )}
                  </ImageListItem>
                ))}
            </ImageList>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No screenshots available
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 