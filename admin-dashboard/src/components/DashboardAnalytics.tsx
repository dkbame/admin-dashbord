'use client'

import { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import {
  Apps as AppsIcon,
  Star as StarIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon
} from '@mui/icons-material'

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
  created_at?: string
}

interface Screenshot {
  id: string
  url: string
  caption: string
  display_order: number
}

interface DashboardAnalyticsProps {
  apps: App[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DashboardAnalytics({ apps }: DashboardAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30d')

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalApps = apps.length
    const featuredApps = apps.filter(app => app.is_featured).length
    const freeApps = apps.filter(app => parseFloat(String(app.price || 0)) === 0).length
    const paidApps = totalApps - freeApps
    const masApps = apps.filter(app => app.is_on_mas).length
    const customApps = totalApps - masApps
    const activeApps = apps.filter(app => app.status === 'ACTIVE').length
    const pendingApps = apps.filter(app => app.status === 'PENDING').length
    const inactiveApps = apps.filter(app => app.status === 'INACTIVE').length

    return {
      totalApps,
      featuredApps,
      freeApps,
      paidApps,
      masApps,
      customApps,
      activeApps,
      pendingApps,
      inactiveApps
    }
  }, [apps])

  // Category distribution data
  const categoryData = useMemo(() => {
    const categoryCounts: { [key: string]: number } = {}
    
    apps.forEach(app => {
      const categoryName = app.category?.name || 'Uncategorized'
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1
    })

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 categories
  }, [apps])

  // Price distribution data
  const priceData = useMemo(() => {
    const priceRanges = [
      { name: 'Free', min: 0, max: 0, count: 0 },
      { name: '$0.01-$4.99', min: 0.01, max: 4.99, count: 0 },
      { name: '$5.00-$9.99', min: 5, max: 9.99, count: 0 },
      { name: '$10.00-$19.99', min: 10, max: 19.99, count: 0 },
      { name: '$20.00+', min: 20, max: Infinity, count: 0 }
    ]

    apps.forEach(app => {
      const price = parseFloat(String(app.price || 0))
      const range = priceRanges.find(r => price >= r.min && price <= r.max)
      if (range) {
        range.count++
      }
    })

    return priceRanges.filter(r => r.count > 0)
  }, [apps])

  // Source distribution data
  const sourceData = useMemo(() => [
    { name: 'Mac App Store', value: metrics.masApps, color: '#0088FE' },
    { name: 'Custom', value: metrics.customApps, color: '#00C49F' }
  ], [metrics])

  // Status distribution data
  const statusData = useMemo(() => [
    { name: 'Active', value: metrics.activeApps, color: '#00C49F' },
    { name: 'Pending', value: metrics.pendingApps, color: '#FFBB28' },
    { name: 'Inactive', value: metrics.inactiveApps, color: '#FF8042' }
  ], [metrics])

  // Recent activity (apps added in last 30 days)
  const recentActivity = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return apps
      .filter(app => {
        if (!app.created_at) return false
        const createdDate = new Date(app.created_at)
        return createdDate >= thirtyDaysAgo
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || '')
        const dateB = new Date(b.created_at || '')
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 5)
  }, [apps])

  return (
    <Box>
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Apps
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.totalApps}
                  </Typography>
                </Box>
                <AppsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Featured Apps
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.featuredApps}
                  </Typography>
                </Box>
                <StarIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Free Apps
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.freeApps}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Apps
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.activeApps}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Price Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Source Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                App Source Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const percentage = typeof percent === 'number' ? (percent * 100).toFixed(0) : '0'
                      return `${name} ${percentage}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                App Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const percentage = typeof percent === 'number' ? (percent * 100).toFixed(0) : '0'
                      return `${name} ${percentage}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity (Last 30 Days)
          </Typography>
          {recentActivity.length > 0 ? (
            <List>
              {recentActivity.map((app, index) => (
                <Box key={app.id}>
                  <ListItem>
                    <ListItemIcon>
                      <AppsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={app.name}
                      secondary={`Added by ${app.developer} • ${app.category?.name || 'Uncategorized'}`}
                    />
                    <Chip
                      label={app.is_featured ? 'Featured' : 'Standard'}
                      color={app.is_featured ? 'warning' : 'default'}
                      size="small"
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
              No recent activity
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
} 