'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Snackbar,
  Alert,
  Chip,
  Typography,
  Fade,
  IconButton
} from '@mui/material'
import {
  NotificationsActive,
  NotificationsOff,
  Close,
  Add,
  Edit,
  Delete,
  Star,
  StarBorder
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

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
  const [isConnected, setIsConnected] = useState(false)
  const [showNotifications, setShowNotifications] = useState(true)

  useEffect(() => {
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apps'
        },
        (payload) => {
          handleAppChange(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screenshots'
        },
        (payload) => {
          handleScreenshotChange(payload)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAppChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let notification: Notification | null = null

    switch (eventType) {
      case 'INSERT':
        notification = {
          id: Date.now().toString(),
          type: 'success',
          message: `New app added: ${newRecord.name}`,
          timestamp: new Date(),
          action: 'INSERT',
          appName: newRecord.name
        }
        break
      
      case 'UPDATE':
        // Check what changed
        if (newRecord.is_featured !== oldRecord.is_featured) {
          notification = {
            id: Date.now().toString(),
            type: 'info',
            message: `${newRecord.name} ${newRecord.is_featured ? 'featured' : 'unfeatured'}`,
            timestamp: new Date(),
            action: 'FEATURED_TOGGLE',
            appName: newRecord.name
          }
        } else {
          notification = {
            id: Date.now().toString(),
            type: 'info',
            message: `${newRecord.name} updated`,
            timestamp: new Date(),
            action: 'UPDATE',
            appName: newRecord.name
          }
        }
        break
      
      case 'DELETE':
        notification = {
          id: Date.now().toString(),
          type: 'warning',
          message: `App deleted: ${oldRecord.name}`,
          timestamp: new Date(),
          action: 'DELETE',
          appName: oldRecord.name
        }
        break
    }

    if (notification) {
      addNotification(notification)
    }
  }

  const handleScreenshotChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let notification: Notification | null = null

    switch (eventType) {
      case 'INSERT':
        notification = {
          id: Date.now().toString(),
          type: 'info',
          message: 'Screenshots added to an app',
          timestamp: new Date(),
          action: 'SCREENSHOT_ADDED'
        }
        break
      
      case 'DELETE':
        notification = {
          id: Date.now().toString(),
          type: 'warning',
          message: 'Screenshots removed from an app',
          timestamp: new Date(),
          action: 'SCREENSHOT_DELETED'
        }
        break
    }

    if (notification) {
      addNotification(notification)
    }
  }

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

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'INSERT':
        return <Add fontSize="small" />
      case 'UPDATE':
        return <Edit fontSize="small" />
      case 'DELETE':
        return <Delete fontSize="small" />
      case 'FEATURED_TOGGLE':
        return <Star fontSize="small" />
      default:
        return null
    }
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
                icon={getActionIcon(notification.action)}
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