'use client'

import { Box, Typography, Paper, Alert, CircularProgress, Button, Tabs, Tab } from '@mui/material'
import { Add, Analytics, List } from '@mui/icons-material'
import { useState } from 'react'
import Link from 'next/link'
import AdminStatus from '@/components/AdminStatus'
import AppsTable from '@/components/AppsTable'
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'
import DashboardAnalytics from '@/components/DashboardAnalytics'
import RealtimeNotifications from '@/components/RealtimeNotifications'
import { useApps } from '@/hooks/useApps'
import { AppListItem } from '@/types/app'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function DashboardPage() {
  const { 
    apps, 
    loading, 
    error, 
    fetchApps, 
    toggleFeatured, 
    deleteApp, 
    deleteSingleApp,
    clearError,
    lastUpdate
  } = useApps()
  
  const [tabValue, setTabValue] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [appToDelete, setAppToDelete] = useState<AppListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [updatingFeatured, setUpdatingFeatured] = useState<string | null>(null)
  
  // Bulk operations state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [appsToDelete, setAppsToDelete] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const [bulkUpdatingFeatured, setBulkUpdatingFeatured] = useState<Set<string>>(new Set())

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

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
      await deleteSingleApp(appToDelete.id)
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

  // Bulk operations handlers
  const handleBulkDelete = (appIds: string[]) => {
    setAppsToDelete(appIds)
    setBulkDeleteDialogOpen(true)
    setBulkDeleteError(null)
  }

  const handleBulkDeleteConfirm = async () => {
    if (appsToDelete.length === 0) return
    
    setBulkDeleting(true)
    setBulkDeleteError(null)
    
    try {
      // Delete apps one by one (could be optimized with a bulk delete API)
      for (const appId of appsToDelete) {
        await deleteApp(appId)
      }
      setBulkDeleteDialogOpen(false)
      setAppsToDelete([])
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : 'Failed to delete some apps')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkDeleteCancel = () => {
    setBulkDeleteDialogOpen(false)
    setAppsToDelete([])
    setBulkDeleteError(null)
  }

  const handleBulkToggleFeatured = async (appIds: string[], featured: boolean) => {
    setBulkUpdatingFeatured(new Set(appIds))
    try {
      // Toggle featured status for each app
      for (const appId of appIds) {
        await toggleFeatured(appId, !featured)
      }
    } catch (err) {
      console.error('Error toggling bulk featured status:', err)
    } finally {
      setBulkUpdatingFeatured(new Set())
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
      <AdminStatus showDetails={true} />
      
      {/* Real-time Notifications */}
      <RealtimeNotifications />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Dashboard
          </Typography>
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
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

      {/* Dashboard Tabs */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<Analytics />} 
            label="Analytics" 
            iconPosition="start"
          />
          <Tab 
            icon={<List />} 
            label={`All Apps (${apps.length})`} 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <DashboardAnalytics apps={apps} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <AppsTable
              apps={apps}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onToggleFeatured={handleToggleFeatured}
              updatingFeatured={updatingFeatured}
              onBulkDelete={handleBulkDelete}
              onBulkToggleFeatured={handleBulkToggleFeatured}
            />
          </Paper>
        </TabPanel>
      </Paper>

      {/* Single app delete dialog */}
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

      {/* Bulk delete dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onClose={handleBulkDeleteCancel}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Multiple Apps"
        message={`Are you sure you want to delete ${appsToDelete.length} app${appsToDelete.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        itemName={`${appsToDelete.length} app${appsToDelete.length !== 1 ? 's' : ''}`}
        loading={bulkDeleting}
        error={bulkDeleteError}
      />
    </Box>
  )
} 