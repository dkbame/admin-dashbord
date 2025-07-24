'use client'

import { Box } from '@mui/material'
import AppCollections from '@/components/AppCollections'
import { useApps } from '@/hooks/useApps'

export default function CollectionsPage() {
  const { apps, loading, error } = useApps()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        Loading collections...
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <div>Error loading apps: {error}</div>
      </Box>
    )
  }

  return <AppCollections apps={apps} />
} 