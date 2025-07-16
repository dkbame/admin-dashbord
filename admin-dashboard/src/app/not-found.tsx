'use client'

import { Box, Button, Typography, Container, Paper } from '@mui/material'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

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
            404 - Page Not Found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            The page you are looking for does not exist.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            Go to Home
          </Button>
        </Paper>
      </Box>
    </Container>
  )
} 