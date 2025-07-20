'use client'

import { Box, Typography, Paper, Alert, CircularProgress, Button } from '@mui/material'
import { Add } from '@mui/icons-material'
import { useState } from 'react'
import Link from 'next/link'
import AdminStatus from '@/components/AdminStatus'
import AppsTable from '@/components/AppsTable'
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'
import { useApps } from '@/hooks/useApps'
import { AppListItem } from '@/types/app'

export default function DashboardPage() {
  const { 
    apps, 
    loading, 
    error, 
    fetchApps, 
    toggleFeatured, 
    deleteApp, 
    clearError 
  } = useApps()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [appToDelete, setAppToDelete] = useState<AppListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [updatingFeatured, setUpdatingFeatured] = useState<string | null>(null)

  const handleDeleteClick = (app: AppListItem) => {
    setAppToDelete(app)
    setDeleteDialogOpen(true)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return
    
    setDeleting(true)
    setDeleteError(null)
    
    try {
      await deleteApp(appToDelete.id)
      setDeleteDialogOpen(false)
      setAppToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete app')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setAppToDelete(null)
    setDeleteError(null)
  }

  const handleToggleFeatured = async (appId: string, currentFeatured: boolean) => {
    setUpdatingFeatured(appId)
    try {
      await toggleFeatured(appId, currentFeatured)
    } catch (err) {
      console.error('Error toggling featured status:', err)
    } finally {
      setUpdatingFeatured(null)
    }
  }

  const handleEdit = (appId: string) => {
    window.open(`/dashboard/edit/${appId}`, '_blank')
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
      <AdminStatus showDetails={true} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          All Apps ({apps.length})
        </Typography>
        <Link href="/dashboard/add" style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ borderRadius: '20px', px: 3 }}
          >
            Add New App
          </Button>
        </Link>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <AppsTable
          apps={apps}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onToggleFeatured={handleToggleFeatured}
          updatingFeatured={updatingFeatured}
        />
      </Paper>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete App"
        message="Are you sure you want to delete this app?"
        itemName={appToDelete?.name}
        loading={deleting}
        error={deleteError}
      />
    </Box>
  )
} 