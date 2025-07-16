'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { AdminPanelSettings, Person, Security } from '@mui/icons-material'

interface User {
  id: string
  email: string
  created_at: string
  role?: string
  is_admin?: boolean
}

export default function AdminManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // Get all users from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        throw authError
      }

      // Get admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('*')

      if (rolesError) {
        throw rolesError
      }

      // Combine user data with admin roles
      const usersWithRoles = authUsers.users.map(user => {
        const adminRole = adminRoles?.find(role => role.user_id === user.id)
        return {
          id: user.id,
          email: user.email || 'No email',
          created_at: user.created_at,
          role: adminRole?.role || null,
          is_admin: !!adminRole
        }
      })

      setUsers(usersWithRoles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminRole = async (userId: string, currentRole: string | null) => {
    try {
      if (currentRole) {
        // Remove admin role
        const { error } = await supabase
          .from('admin_roles')
          .delete()
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Add admin role
        const { error } = await supabase
          .from('admin_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          })

        if (error) throw error
      }

      // Refresh user list
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin role')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdminPanelSettings sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Admin Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage admin roles for all registered users
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.is_admin ? (
                        <AdminPanelSettings color="primary" fontSize="small" />
                      ) : (
                        <Person color="action" fontSize="small" />
                      )}
                      <Typography variant="body2">
                        {user.email.split('@')[0]}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Chip
                        label={user.role || 'Admin'}
                        color="primary"
                        size="small"
                        icon={<AdminPanelSettings />}
                      />
                    ) : (
                      <Chip
                        label="User"
                        color="default"
                        size="small"
                        icon={<Person />}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant={user.is_admin ? "outlined" : "contained"}
                      size="small"
                      color={user.is_admin ? "error" : "primary"}
                      onClick={() => toggleAdminRole(user.id, user.role || null)}
                      startIcon={user.is_admin ? <Security /> : <AdminPanelSettings />}
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
} 