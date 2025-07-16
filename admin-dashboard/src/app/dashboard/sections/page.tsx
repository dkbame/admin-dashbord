'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  TextField,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material'
import { 
  Star, 
  StarBorder, 
  FeaturedPlayList, 
  Schedule, 
  TrendingUp, 
  FreeBreakfast,
  Visibility,
  VisibilityOff,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material'

interface App {
  id: string
  name: string
  developer: string | null
  is_featured: boolean | null
  is_free: boolean | null
  rating: number | null
  created_at: string
  category_id: string
}

interface SectionConfig {
  featured_count: number
  recently_added_count: number
  top_rated_count: number
  free_apps_count: number
}

export default function SectionManagementPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    featured_count: 5,
    recently_added_count: 10,
    top_rated_count: 10,
    free_apps_count: 10
  })
  const [editingApp, setEditingApp] = useState<string | null>(null)

  useEffect(() => {
    fetchApps()
    fetchSectionConfig()
  }, [])

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApps(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch apps')
    } finally {
      setLoading(false)
    }
  }

  const fetchSectionConfig = async () => {
    try {
      // For now, we'll use default values
      // In the future, this could be stored in a config table
      setSectionConfig({
        featured_count: 5,
        recently_added_count: 10,
        top_rated_count: 10,
        free_apps_count: 10
      })
    } catch (err) {
      console.error('Failed to fetch section config:', err)
    }
  }

  const toggleFeatured = async (appId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ is_featured: !currentFeatured })
        .eq('id', appId)

      if (error) throw error
      await fetchApps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update featured status')
    }
  }

  const toggleFree = async (appId: string, currentFree: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ is_free: !currentFree })
        .eq('id', appId)

      if (error) throw error
      await fetchApps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update free status')
    }
  }

  const getFeaturedApps = () => {
    return apps.filter(app => app.is_featured).slice(0, sectionConfig.featured_count)
  }

  const getRecentlyAddedApps = () => {
    return apps.slice(0, sectionConfig.recently_added_count)
  }

  const getTopRatedApps = () => {
    return apps
      .filter(app => app.rating && app.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, sectionConfig.top_rated_count)
  }

  const getFreeApps = () => {
    return apps.filter(app => app.is_free).slice(0, sectionConfig.free_apps_count)
  }

  const renderAppsTable = (apps: App[], title: string, showFeaturedToggle = false, showFreeToggle = false) => (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title} ({apps.length} apps)
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>App Name</TableCell>
              <TableCell>Developer</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Created</TableCell>
              {showFeaturedToggle && <TableCell>Featured</TableCell>}
              {showFreeToggle && <TableCell>Free</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {app.name}
                  </Typography>
                </TableCell>
                <TableCell>{app.developer || 'Unknown'}</TableCell>
                <TableCell>
                  {app.rating ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                      <Typography variant="body2">{app.rating.toFixed(1)}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No rating</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(app.created_at).toLocaleDateString()}
                </TableCell>
                {showFeaturedToggle && (
                  <TableCell>
                    <Switch
                      checked={!!app.is_featured}
                      onChange={() => toggleFeatured(app.id, !!app.is_featured)}
                      color="primary"
                    />
                  </TableCell>
                )}
                {showFreeToggle && (
                  <TableCell>
                    <Switch
                      checked={!!app.is_free}
                      onChange={() => toggleFree(app.id, !!app.is_free)}
                      color="primary"
                    />
                  </TableCell>
                )}
                <TableCell align="right">
                  <Tooltip title="Edit App">
                    <IconButton size="small" onClick={() => window.open(`/dashboard/edit/${app.id}`, '_blank')}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FeaturedPlayList sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Section Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<Star />} 
            label="Featured Apps" 
            iconPosition="start"
          />
          <Tab 
            icon={<Schedule />} 
            label="Recently Added" 
            iconPosition="start"
          />
          <Tab 
            icon={<TrendingUp />} 
            label="Top Rated" 
            iconPosition="start"
          />
          <Tab 
            icon={<FreeBreakfast />} 
            label="Free Apps" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Featured Apps Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control which apps appear in the carousel on the iOS app. These apps will be displayed prominently with their screenshots as backgrounds.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Featured Apps"
                    type="number"
                    value={sectionConfig.featured_count}
                    onChange={(e) => setSectionConfig(prev => ({
                      ...prev,
                      featured_count: parseInt(e.target.value) || 5
                    }))}
                    inputProps={{ min: 1, max: 20 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          {renderAppsTable(getFeaturedApps(), 'Featured Apps', true, false)}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recently Added Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control how many recently added apps are shown in the iOS app. These are automatically sorted by creation date.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Recently Added Apps"
                    type="number"
                    value={sectionConfig.recently_added_count}
                    onChange={(e) => setSectionConfig(prev => ({
                      ...prev,
                      recently_added_count: parseInt(e.target.value) || 10
                    }))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          {renderAppsTable(getRecentlyAddedApps(), 'Recently Added Apps', false, false)}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Rated Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control how many top-rated apps are shown in the iOS app. These are automatically sorted by rating (highest first).
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Top Rated Apps"
                    type="number"
                    value={sectionConfig.top_rated_count}
                    onChange={(e) => setSectionConfig(prev => ({
                      ...prev,
                      top_rated_count: parseInt(e.target.value) || 10
                    }))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          {renderAppsTable(getTopRatedApps(), 'Top Rated Apps', false, false)}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Free Apps Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control which apps are marked as free and how many are shown in the iOS app.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Free Apps to Show"
                    type="number"
                    value={sectionConfig.free_apps_count}
                    onChange={(e) => setSectionConfig(prev => ({
                      ...prev,
                      free_apps_count: parseInt(e.target.value) || 10
                    }))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          {renderAppsTable(getFreeApps(), 'Free Apps', false, true)}
        </Box>
      )}
    </Box>
  )
} 