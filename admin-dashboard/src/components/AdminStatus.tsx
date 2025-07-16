'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { Box, Typography, Chip, Alert, Button } from '@mui/material'
import { AdminPanelSettings, Security } from '@mui/icons-material'

interface AdminStatusProps {
  showDetails?: boolean
}

export default function AdminStatus({ showDetails = false }: AdminStatusProps) {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      checkAdminStatus()
    }
  }, [user])

  const checkAdminStatus = async () => {
    try {
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user?.id })

      if (adminError) {
        console.error('Error checking admin status:', adminError)
        setIsAdmin(false)
      } else {
        setIsAdmin(adminData)
      }

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { user_id: user?.id })

      if (roleError) {
        console.error('Error getting user role:', roleError)
        setUserRole(null)
      } else {
        setUserRole(roleData)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const makeAdmin = async () => {
    try {
      const { error } = await supabase
        .from('admin_roles')
        .insert({
          user_id: user?.id,
          role: 'admin'
        })

      if (error) {
        console.error('Error making user admin:', error)
      } else {
        await checkAdminStatus()
      }
    } catch (error) {
      console.error('Error making user admin:', error)
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography>Checking admin status...</Typography>
      </Box>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Box sx={{ mb: 3 }}>
      {isAdmin ? (
        <Alert 
          severity="success" 
          icon={<AdminPanelSettings />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Admin Access Granted
          </Typography>
          {showDetails && userRole && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" component="span">
                Role: <Chip label={userRole} size="small" color="primary" />
              </Typography>
            </Box>
          )}
        </Alert>
      ) : (
        <Alert 
          severity="warning" 
          icon={<Security />}
          action={
            <Button color="inherit" size="small" onClick={makeAdmin}>
              Make Admin
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Limited Access
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You need admin privileges to access all features.
          </Typography>
        </Alert>
      )}

      {showDetails && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            User Details
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> {user.email}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>User ID:</strong> {user.id}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Admin Status:</strong> {isAdmin ? 'Yes' : 'No'}
          </Typography>
          {userRole && (
            <Typography variant="body2">
              <strong>Role:</strong> {userRole}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
} 