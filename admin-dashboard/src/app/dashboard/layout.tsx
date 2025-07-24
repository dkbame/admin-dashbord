'use client'

import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Button } from '@mui/material'
import { Apps, Add, Category, Settings, Menu as MenuIcon, LightMode, DarkMode, Logout, AdminPanelSettings, FeaturedPlayList, Collections, CloudDownload as BulkImportIcon, Download } from '@mui/icons-material'
import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'

const DRAWER_WIDTH = 240

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mode, toggleColorMode } = useTheme()
  const { signOut } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await signOut()
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          macOS App Discovery
        </Typography>
      </Toolbar>
      <List sx={{ flex: 1, px: 2 }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Apps />
            </ListItemIcon>
            <ListItemText primary="All Apps" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/add" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Add />
            </ListItemIcon>
            <ListItemText primary="Add App" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/bulk-import" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <BulkImportIcon />
            </ListItemIcon>
            <ListItemText primary="Bulk Import" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/macupdate-import" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Download />
            </ListItemIcon>
            <ListItemText primary="MacUpdate Import" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/categories" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Category />
            </ListItemIcon>
            <ListItemText primary="Categories" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <AdminPanelSettings />
            </ListItemIcon>
            <ListItemText primary="Admin Management" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/sections" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <FeaturedPlayList />
            </ListItemIcon>
            <ListItemText primary="Section Management" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <Link href="/dashboard/collections" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Collections />
            </ListItemIcon>
            <ListItemText primary="Collections" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
      </List>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500 }} />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <ProtectedRoute>
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            Dashboard
          </Typography>
          <Button
            color="inherit"
            onClick={toggleColorMode}
            startIcon={mode === 'dark' ? <LightMode /> : <DarkMode />}
          >
            {mode === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
    </ProtectedRoute>
  )
} 