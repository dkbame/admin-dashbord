'use client'

import { useState } from 'react'
import {
  Box,
  Alert,
  Chip,
  Typography,
  Fade,
  IconButton
} from '@mui/material'
import {
  NotificationsActive,
  NotificationsOff,
  Close
} from '@mui/icons-material'

interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
  timestamp: Date
  action?: string
  appName?: string
}

interface RealtimeNotificationsProps {
  onNotification?: (notification: Notification) => void
}

export default function RealtimeNotifications({ onNotification }: RealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(true) // Default to connected for now
  const [showNotifications, setShowNotifications] = useState(true)

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep last 5 notifications
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id)
    }, 5000)

    // Call parent callback if provided
    if (onNotification) {
      onNotification(notification)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1300 }}>
      {/* Connection Status */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={isConnected ? <NotificationsActive /> : <NotificationsOff />}
          label={isConnected ? 'Live Updates' : 'Offline'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
        <IconButton
          size="small"
          onClick={() => setShowNotifications(!showNotifications)}
          sx={{ color: showNotifications ? 'primary.main' : 'text.secondary' }}
        >
          {showNotifications ? <NotificationsActive /> : <NotificationsOff />}
        </IconButton>
      </Box>

      {/* Notifications Stack */}
      {showNotifications && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {notifications.map((notification, index) => (
            <Fade in={true} key={notification.id} timeout={300 + index * 100}>
              <Alert
                severity={notification.type}
                action={
                  <IconButton
                    size="small"
                    onClick={() => removeNotification(notification.id)}
                    sx={{ color: 'inherit' }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                }
                sx={{
                  minWidth: 300,
                  maxWidth: 400,
                  boxShadow: 2,
                  '& .MuiAlert-message': {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.timestamp.toLocaleTimeString()}
                </Typography>
              </Alert>
            </Fade>
          ))}
        </Box>
      )}
    </Box>
  )
} 