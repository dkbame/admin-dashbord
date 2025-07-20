'use client'

import React, { useState, useEffect } from 'react'
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import { Add, Edit, Delete, ArrowBack } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface InAppPurchase {
  id: string
  app_id: string
  name: string
  description: string | null
  price: string
  currency: string
  purchase_type: 'CONSUMABLE' | 'NON_CONSUMABLE' | 'AUTO_RENEWABLE' | 'NON_RENEWING'
  duration: string | null
  mas_product_id: string | null
  display_order: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface App {
  id: string
  name: string
  developer: string
  has_in_app_purchases: boolean
  pricing_model: string | null
}

export default function InAppPurchasePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [app, setApp] = useState<App | null>(null)
  const [iapList, setIapList] = useState<InAppPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIap, setEditingIap] = useState<InAppPurchase | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    purchase_type: 'NON_CONSUMABLE' as 'CONSUMABLE' | 'NON_CONSUMABLE' | 'AUTO_RENEWABLE' | 'NON_RENEWING',
    duration: '',
    mas_product_id: '',
    is_featured: false
  })

  useEffect(() => {
    fetchApp()
    fetchInAppPurchases()
  }, [])

  const fetchApp = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('id, name, developer, has_in_app_purchases, pricing_model')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setApp(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch app')
    }
  }

  const fetchInAppPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('in_app_purchases')
        .select('*')
        .eq('app_id', params.id)
        .order('display_order')

      if (error) throw error
      setIapList(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch in-app purchases')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const iapData = {
        app_id: params.id,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        currency: formData.currency,
        purchase_type: formData.purchase_type,
        duration: formData.duration || null,
        mas_product_id: formData.mas_product_id || null,
        display_order: iapList.length + 1,
        is_featured: formData.is_featured
      }

      if (editingIap) {
        const { error } = await supabase
          .from('in_app_purchases')
          .update(iapData)
          .eq('id', editingIap.id)

        if (error) throw error
        setSuccess('In-app purchase updated successfully!')
      } else {
        const { error } = await supabase
          .from('in_app_purchases')
          .insert([iapData])

        if (error) throw error
        setSuccess('In-app purchase added successfully!')
      }

      setDialogOpen(false)
      setEditingIap(null)
      resetForm()
      fetchInAppPurchases()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save in-app purchase')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (iap: InAppPurchase) => {
    setEditingIap(iap)
    setFormData({
      name: iap.name,
      description: iap.description || '',
      price: iap.price,
      currency: iap.currency,
      purchase_type: iap.purchase_type,
      duration: iap.duration || '',
      mas_product_id: iap.mas_product_id || '',
      is_featured: iap.is_featured
    })
    setDialogOpen(true)
  }

  const handleDelete = async (iapId: string) => {
    if (!confirm('Are you sure you want to delete this in-app purchase?')) return

    try {
      const { error } = await supabase
        .from('in_app_purchases')
        .delete()
        .eq('id', iapId)

      if (error) throw error
      setSuccess('In-app purchase deleted successfully!')
      fetchInAppPurchases()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete in-app purchase')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      purchase_type: 'NON_CONSUMABLE',
      duration: '',
      mas_product_id: '',
      is_featured: false
    })
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingIap(null)
    resetForm()
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
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          In-App Purchases
        </Typography>
      </Box>

      {app && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {app.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Developer: {app.developer}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pricing Model: {app.pricing_model || 'Not set'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          In-App Purchase Options ({iapList.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Add IAP
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Featured</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {iapList.map((iap) => (
                <TableRow key={iap.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {iap.name}
                      </Typography>
                      {iap.description && (
                        <Typography variant="caption" color="text.secondary">
                          {iap.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {iap.currency} {iap.price}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={iap.purchase_type.replace('_', ' ')}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {iap.duration || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={iap.is_featured ? 'Yes' : 'No'}
                      size="small"
                      color={iap.is_featured ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(iap)}
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(iap.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIap ? 'Edit In-App Purchase' : 'Add In-App Purchase'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Purchase Type</InputLabel>
                  <Select
                    value={formData.purchase_type}
                    label="Purchase Type"
                    onChange={(e) => setFormData({ ...formData, purchase_type: e.target.value as any })}
                  >
                    <MenuItem value="CONSUMABLE">Consumable</MenuItem>
                    <MenuItem value="NON_CONSUMABLE">Non-Consumable</MenuItem>
                    <MenuItem value="AUTO_RENEWABLE">Auto-Renewable</MenuItem>
                    <MenuItem value="NON_RENEWING">Non-Renewing</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Duration (for subscriptions)"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="monthly, yearly, lifetime"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mac App Store Product ID"
                  value={formData.mas_product_id}
                  onChange={(e) => setFormData({ ...formData, mas_product_id: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : (editingIap ? 'Update' : 'Add')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
} 