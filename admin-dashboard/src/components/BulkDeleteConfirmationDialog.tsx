'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip
} from '@mui/material'
import { Warning, Delete, Apps } from '@mui/icons-material'

interface AppPreview {
  id: string
  name: string
  developer: string
}

interface BulkDeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  appIds: string[]
  loading?: boolean
  error?: string | null
}

export default function BulkDeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  appIds,
  loading = false,
  error = null
}: BulkDeleteConfirmationDialogProps) {
  const [previewApps, setPreviewApps] = useState<AppPreview[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Load app previews when dialog opens
  useEffect(() => {
    if (open && appIds.length > 0) {
      loadAppPreviews()
    }
  }, [open, appIds])

  const loadAppPreviews = async () => {
    if (appIds.length === 0) return

    setPreviewLoading(true)
    setPreviewError(null)

    try {
      const response = await fetch(`/api/bulk-delete?appIds=${appIds.join(',')}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load app previews')
      }

      setPreviewApps(result.apps || [])
    } catch (err) {
      console.error('Error loading app previews:', err)
      setPreviewError(err instanceof Error ? err.message : 'Failed to load app previews')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        Bulk Delete Apps
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {previewError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {previewError}
          </Alert>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to delete <strong>{appIds.length}</strong> apps?
          </Typography>
          
          <Chip 
            icon={<Apps />} 
            label={`${appIds.length} apps selected`} 
            color="primary" 
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </Box>

        {/* App Preview List */}
        {previewLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Loading app previews...
            </Typography>
          </Box>
        ) : previewApps.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Apps to be deleted:
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {previewApps.slice(0, 10).map((app) => (
                <ListItem key={app.id} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={app.name}
                    secondary={app.developer}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
              {previewApps.length > 10 && (
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={`... and ${previewApps.length - 10} more apps`}
                    primaryTypographyProps={{ variant: 'body2', fontStyle: 'italic', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>
        ) : null}
        
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>This action cannot be undone.</strong> All selected apps and their associated data including screenshots will be permanently deleted.
          </Typography>
        </Alert>

        <Box sx={{ mt: 2, p: 1, backgroundColor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Ultra-fast deletion:</strong> All apps will be deleted in a single database operation for maximum speed.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={loading}
          variant="contained" 
          color="error"
          startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
          autoFocus
        >
          {loading ? `Deleting ${appIds.length} apps...` : `Delete ${appIds.length} Apps`}
        </Button>
      </DialogActions>
    </Dialog>
  )
} 