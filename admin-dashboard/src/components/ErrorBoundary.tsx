'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button, Alert, Paper } from '@mui/material'
import { Refresh, BugReport, Home } from '@mui/icons-material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send error to logging service
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }

    // Create a mailto link with error details
    const subject = encodeURIComponent('Bug Report - Admin Dashboard Error')
    const body = encodeURIComponent(JSON.stringify(errorDetails, null, 2))
    const mailtoLink = `mailto:support@example.com?subject=${subject}&body=${body}`
    
    window.open(mailtoLink)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: 3,
            backgroundColor: 'background.default'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              maxWidth: 600,
              width: '100%',
              padding: 4,
              textAlign: 'center'
            }}
          >
            <Box sx={{ mb: 3 }}>
              <BugReport
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                  mb: 2
                }}
              />
              
              <Typography variant="h4" component="h1" gutterBottom>
                Something went wrong
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </Typography>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details (Development):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 200
                }}>
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                size="large"
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
                size="large"
              >
                Go Home
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<BugReport />}
                onClick={this.handleReportBug}
                size="large"
              >
                Report Bug
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              Error ID: {this.state.error?.message?.substring(0, 8)}...
            </Typography>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}

// MARK: - Error Fallback Component
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error
  resetErrorBoundary: () => void 
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        textAlign: 'center'
      }}
    >
      <BugReport
        sx={{
          fontSize: 48,
          color: 'error.main',
          mb: 2
        }}
      />
      
      <Typography variant="h6" gutterBottom>
        Something went wrong
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {error.message}
      </Typography>
      
      <Button
        variant="contained"
        onClick={resetErrorBoundary}
        startIcon={<Refresh />}
      >
        Try Again
      </Button>
    </Box>
  )
}

// MARK: - Error Alert Component
export function ErrorAlert({ 
  error, 
  onRetry, 
  onDismiss 
}: { 
  error: string
  onRetry?: () => void
  onDismiss?: () => void 
}) {
  return (
    <Alert
      severity="error"
      action={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              color="inherit"
              size="small"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </Box>
      }
      sx={{ mb: 2 }}
    >
      {error}
    </Alert>
  )
}

// MARK: - Network Error Component
export function NetworkError({ 
  onRetry 
}: { 
  onRetry: () => void 
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        textAlign: 'center'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Network Error
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Unable to connect to the server. Please check your internet connection and try again.
      </Typography>
      
      <Button
        variant="contained"
        onClick={onRetry}
        startIcon={<Refresh />}
      >
        Retry Connection
      </Button>
    </Box>
  )
} 