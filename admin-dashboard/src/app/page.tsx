'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Box, Button, Typography, Container } from '@mui/material'
import { Dashboard } from '@mui/icons-material'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Dashboard sx={{ fontSize: 64, color: 'primary.main', mb: 3 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          macOS App Discovery
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Admin Dashboard
        </Typography>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Dashboard />}
            sx={{ px: 4, py: 1.5, borderRadius: 2 }}
          >
            Sign In to Dashboard
          </Button>
        </Link>
      </Box>
    </Container>
  )
}
