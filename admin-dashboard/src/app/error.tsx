'use client'

import { useEffect } from 'react'
import { Box, Button, Typography, Container, Paper } from '@mui/material'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom>
            Something went wrong!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error.message || 'An unexpected error occurred'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => reset()}
            sx={{ mt: 2 }}
          >
            Try again
          </Button>
        </Paper>
      </Box>
    </Container>
  )
} 