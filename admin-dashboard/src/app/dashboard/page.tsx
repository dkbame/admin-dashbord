'use client'

import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Card, Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Avatar, ImageList, ImageListItem } from '@mui/material'
import { Edit, Delete, Add, Image as ImageIcon } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import AdminStatus from '@/components/AdminStatus'

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
  price: number
  is_on_mas: boolean
  status: string
  icon_url: string | null
  screenshots: Screenshot[]
}

export default function DashboardPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [screenshotsOpen, setScreenshotsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [appToDelete, setAppToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      console.log('Fetching apps from Supabase...');
      
      const { data, error } = await supabase
        .from('apps')
        .select(`
          id,
          name,
          developer,
          category:categories!apps_category_id_fkey (name),
          price,
          is_on_mas,
          status,
          icon_url,
          screenshots:screenshots!fk_app (
            id,
            url,
            caption,
            display_order
          )
        `)
        .order('created_at', { ascending: false })

      // Enhanced debugging output
      console.log('Supabase apps data:', data);
      console.log('Supabase apps error:', error);
      console.log('Data type:', typeof data);
      console.log('Data length:', data?.length);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      if (!data) {
        console.warn('No data returned from Supabase');
        setApps([]);
        return;
      }

      // Properly type the response data and handle price field
      const typedData = (data || []).map(item => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : 0,
        category: Array.isArray(item.category) ? item.category[0] : item.category
      })) as App[];
      
      console.log('Processed apps data:', typedData);
      setApps(typedData);
    } catch (err) {
      console.error('Error in fetchApps:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (id: string) => {
    setAppToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return
    
    try {
      console.log('Attempting to delete app with ID:', appToDelete);
      
      // First, verify the app exists
      const { data: existingApp, error: fetchError } = await supabase
        .from('apps')
        .select('id, name')
        .eq('id', appToDelete)
        .single()
      
      console.log('App before deletion:', existingApp);
      console.log('Fetch error before deletion:', fetchError);
      
      if (fetchError) {
        console.error('Error fetching app before deletion:', fetchError);
        throw new Error('App not found')
      }
      
      // First delete related records manually (in case cascade isn't working)
      console.log('Deleting related records...');
      
      // Skip manual screenshots deletion - let the SQL function handle it
      console.log('Skipping manual screenshots deletion - SQL function will handle it');
      
      // Skip custom_metadata and ratings since they don't exist
      console.log('Skipping custom_metadata and ratings tables (they do not exist)');
      
      // Now delete the app using the SQL function (bypasses RLS)
      console.log('Attempting to delete app using SQL function...');
      
      const { error: sqlError } = await supabase.rpc('delete_app_by_id', { target_app_id: appToDelete });
      
      console.log('SQL function delete error:', sqlError);
      
      if (sqlError) {
        console.error('SQL function delete failed:', sqlError);
        
        // Fallback to regular delete method
        console.log('Trying regular delete method as fallback...');
        const { data: deleteData, error: deleteError } = await supabase
          .from('apps')
          .delete()
          .eq('id', appToDelete)
          .select('id, name')
        
        console.log('Fallback delete response data:', deleteData);
        console.log('Fallback delete error:', deleteError);
        
        if (deleteError) {
          throw new Error(`Both SQL function and regular delete failed. SQL: ${sqlError.message}, Regular: ${deleteError.message}`);
        }
      } else {
        console.log('SQL function delete successful');
      }

      if (error) {
        console.error('Supabase delete error:', error);
        throw error
      }

      // Verify the app was actually deleted
      const { data: deletedApp, error: verifyError } = await supabase
        .from('apps')
        .select('id')
        .eq('id', appToDelete)
      
      console.log('App after deletion (should be empty array):', deletedApp);
      console.log('Verify error (should be null):', verifyError);
      
      if (deletedApp && deletedApp.length > 0) {
        console.error('App still exists after deletion!');
        console.error('This suggests a foreign key constraint or RLS policy issue');
        
        // Try to get more information about why the delete failed
        const { data: relatedData, error: relatedError } = await supabase
          .from('screenshots')
          .select('id, app_id')
          .eq('app_id', appToDelete)
        
        console.log('Related screenshots after deletion:', relatedData);
        console.log('Related screenshots error:', relatedError);
        
        throw new Error('App was not deleted from database - possible RLS or constraint issue')
      }

      console.log('App deleted successfully, refreshing list...');
      fetchApps()
      setDeleteDialogOpen(false)
      setAppToDelete(null)
    } catch (err) {
      console.error('Error in handleDelete:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete app')
      setDeleteDialogOpen(false)
      setAppToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setAppToDelete(null)
  }

  const handleOpenScreenshots = (app: App) => {
    setSelectedApp(app)
    setScreenshotsOpen(true)
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
          All Apps
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
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
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
                  <TableCell>${typeof app.price === 'number' ? app.price.toFixed(2) : '0.00'}</TableCell>
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
                      color={app.status === 'ACTIVE' ? 'success' : app.status === 'PENDING' ? 'warning' : 'error'}
                      size="small"
                      sx={{ minWidth: 80 }}
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
                      href={`/dashboard/edit/${app.id}`}
                      sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteClick(app.id)}
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
      </Card>

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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this app? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 