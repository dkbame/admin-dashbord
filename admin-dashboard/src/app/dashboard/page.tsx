'use client'

import { Box, Typography, Paper, Alert, CircularProgress, Button, Tabs, Tab } from '@mui/material'
import { Add, Analytics, List } from '@mui/icons-material'
import { useState } from 'react'
import Link from 'next/link'
import AdminStatus from '@/components/AdminStatus'
import AppsTable from '@/components/AppsTable'
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'
import BulkDeleteConfirmationDialog from '@/components/BulkDeleteConfirmationDialog'
import DashboardAnalytics from '@/components/DashboardAnalytics'
import RealtimeNotifications from '@/components/RealtimeNotifications'
import PaginationControls from '@/components/PaginationControls'
import FilterControls from '@/components/FilterControls'
import { useApps } from '@/hooks/useApps'
import { AppListItem } from '@/types/app'
import React from 'react'

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
    lastUpdate,
    pagination,
    currentPage,
    selectedCategory,
    searchTerm,
    handlePageChange,
    handleCategoryChange,
    handleSearchChange
  } = useApps()
  
  // Separate state for all apps (for analytics)
  const [allApps, setAllApps] = useState<AppListItem[]>([])
  const [allAppsLoading, setAllAppsLoading] = useState(true)
  
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

  // Fetch all apps for analytics (without pagination/filtering)
  const fetchAllAppsForAnalytics = async () => {
    try {
      setAllAppsLoading(true)
      const response = await fetch('/api/apps?limit=1000') // Get all apps
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch all apps')
      }

      // Handle the new API response structure
      const allAppsData = data.apps || data
      setAllApps(Array.isArray(allAppsData) ? allAppsData : [])
    } catch (err) {
      console.error('Error fetching all apps for analytics:', err)
    } finally {
      setAllAppsLoading(false)
    }
  }

  // Fetch all apps on mount for analytics
  React.useEffect(() => {
    fetchAllAppsForAnalytics()
  }, [])

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
      console.log('UI Delete: Using direct API call for app:', appToDelete.id)
      
      // Use direct API call instead of complex hook logic
      const response = await fetch(`/api/direct-delete?appId=${appToDelete.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      console.log('UI Delete: API response:', result)
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Delete failed')
      }
      
      console.log('UI Delete: Success, refreshing apps...')
      
      // Simple refresh after successful deletion
      await fetchApps()
      // Also refresh analytics data
      await fetchAllAppsForAnalytics()
      
      setDeleteDialogOpen(false)
      setAppToDelete(null)
    } catch (err) {
      console.error('UI Delete: Error:', err)
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
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
    try {
      setUpdatingFeatured(appId)
      await toggleFeatured(appId, currentFeatured)
      // Also refresh analytics data
      await fetchAllAppsForAnalytics()
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
      console.log('Bulk delete: Starting deletion of', appsToDelete.length, 'apps')
      
      // Use the ultra-fast bulk delete API
      const response = await fetch('/api/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          appIds: appsToDelete,
          confirm: true 
        }),
      })
      
      const result = await response.json()
      console.log('Bulk delete: API response:', result)
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Bulk delete failed')
      }
      
      console.log('Bulk delete: Success, refreshing apps...')
      
      // Refresh both paginated apps and analytics data
      await fetchApps()
      await fetchAllAppsForAnalytics()
      
      setBulkDeleteDialogOpen(false)
      setAppsToDelete([])
    } catch (err) {
      console.error('Bulk delete: Error:', err)
      setBulkDeleteError(err instanceof Error ? err.message : 'Bulk delete failed')
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
            label={`All Apps (${pagination?.totalItems || apps.length})`} 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {allAppsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DashboardAnalytics apps={allApps} />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {/* Filter Controls */}
            <FilterControls
              selectedCategory={selectedCategory}
              searchTerm={searchTerm}
              onCategoryChange={handleCategoryChange}
              onSearchChange={handleSearchChange}
              onClearFilters={() => {
                handleCategoryChange('all')
                handleSearchChange('')
              }}
            />
            
            {/* Apps Table */}
            <AppsTable
              apps={apps}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onToggleFeatured={handleToggleFeatured}
              updatingFeatured={updatingFeatured}
              onBulkDelete={handleBulkDelete}
              onBulkToggleFeatured={handleBulkToggleFeatured}
            />
            
            {/* Pagination Controls */}
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
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

      {/* Ultra-fast bulk delete dialog */}
      <BulkDeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onClose={handleBulkDeleteCancel}
        onConfirm={handleBulkDeleteConfirm}
        appIds={appsToDelete}
        loading={bulkDeleting}
        error={bulkDeleteError}
      />
    </Box>
  )
} 