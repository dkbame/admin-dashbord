'use client'

import { Box, CircularProgress, Typography, Skeleton } from '@mui/material'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'spinner' | 'skeleton' | 'fullscreen'
  fullHeight?: boolean
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner',
  fullHeight = false
}: LoadingSpinnerProps) {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 24
      case 'large':
        return 48
      default:
        return 32
    }
  }

  const getSkeletonHeight = () => {
    switch (size) {
      case 'small':
        return 20
      case 'large':
        return 40
      default:
        return 32
    }
  }

  if (variant === 'skeleton') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="rectangular" height={getSkeletonHeight()} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </Box>
    )
  }

  if (variant === 'fullscreen') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: fullHeight ? '100vh' : '50vh',
          gap: 2
        }}
      >
        <CircularProgress size={getSpinnerSize()} />
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        gap: 2
      }}
    >
      <CircularProgress size={getSpinnerSize()} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  )
}

// MARK: - Table Loading Skeleton
export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={24} />
          <Skeleton variant="rectangular" width={100} height={24} />
          <Skeleton variant="rectangular" width={60} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      ))}
    </Box>
  )
}

// MARK: - Card Loading Skeleton
export function CardLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Array.from({ length: cards }).map((_, index) => (
        <Box
          key={index}
          sx={{
            width: 300,
            padding: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <Skeleton variant="rectangular" width="100%" height={120} />
          <Box sx={{ mt: 1 }}>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

// MARK: - Form Loading Skeleton
export function FormLoadingSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: fields }).map((_, index) => (
        <Box key={index}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rectangular" width={100} height={36} />
        <Skeleton variant="rectangular" width={100} height={36} />
      </Box>
    </Box>
  )
}

// MARK: - Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <Box sx={{ padding: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="text" width="60%" />
      </Box>
      
      {/* Content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={200} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="80%" />
      </Box>
    </Box>
  )
} 