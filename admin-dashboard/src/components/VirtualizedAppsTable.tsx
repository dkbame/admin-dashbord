'use client'

import { useState, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Avatar,
  Switch,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography
} from '@mui/material'
import { Edit, Delete, Image as ImageIcon, Star, StarBorder } from '@mui/icons-material'

interface Screenshot {
  id: string
  url: string
  caption: string
  display_order: number
}

interface App {
  id: string
  name: string
  developer: string
  category: { name: string }
  price: string | number | null
  is_on_mas: boolean
  status: string
  icon_url: string | null
  screenshots: Screenshot[]
  is_featured: boolean | null
  is_free: boolean | null
}

interface VirtualizedAppsTableProps {
  apps: App[]
  onEdit: (appId: string) => void
  onDelete: (app: App) => void
  onToggleFeatured: (appId: string, currentFeatured: boolean) => void
  updatingFeatured: string | null
  selectedApps: Set<string>
  onSelectApp: (appId: string) => void
  onSelectAll: () => void
  allSelected: boolean
  indeterminate: boolean
}

const ROW_HEIGHT = 80

export default function VirtualizedAppsTable({
  apps,
  onEdit,
  onDelete,
  onToggleFeatured,
  updatingFeatured,
  selectedApps,
  onSelectApp,
  onSelectAll,
  allSelected,
  indeterminate
}: VirtualizedAppsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'INACTIVE':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatPrice = (price: string | number | null) => {
    if (price === '0' || price === '' || price === null || price === 0) {
      return (
        <Chip
          label="Free"
          color="success"
          size="small"
          sx={{ minWidth: 60 }}
        />
      )
    }
    return <span>${String(price || '0.00')}</span>
  }

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const app = apps[index]
    if (!app) return null

    return (
      <TableRow
        style={style}
        sx={{
          height: ROW_HEIGHT,
          '&:hover': { backgroundColor: 'background.subtle' },
          ...(selectedApps.has(app.id) && {
            backgroundColor: 'action.selected',
            '&:hover': { backgroundColor: 'action.selected' }
          })
        }}
      >
        <TableCell padding="checkbox" sx={{ height: ROW_HEIGHT }}>
          <Checkbox
            checked={selectedApps.has(app.id)}
            onChange={() => onSelectApp(app.id)}
          />
        </TableCell>
        <TableCell 
          component="th" 
          scope="row" 
          sx={{ 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: ROW_HEIGHT
          }}
        >
          {app.icon_url ? (
            <Avatar
              src={app.icon_url}
              alt={app.name}
              sx={{ 
                width: 40, 
                height: 40,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider'
              }}
            />
          ) : (
            <Avatar
              sx={{ 
                width: 40, 
                height: 40,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider'
              }}
            >
              {app.name.charAt(0)}
            </Avatar>
          )}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {app.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {app.developer}
            </Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ height: ROW_HEIGHT }}>
          {app.category?.name || 'Uncategorized'}
        </TableCell>
        <TableCell sx={{ height: ROW_HEIGHT }}>
          {formatPrice(app.price)}
        </TableCell>
        <TableCell sx={{ height: ROW_HEIGHT }}>
          <Chip
            label={app.is_on_mas ? 'Mac App Store' : 'Custom'}
            color={app.is_on_mas ? 'primary' : 'secondary'}
            size="small"
            sx={{ minWidth: 100 }}
          />
        </TableCell>
        <TableCell sx={{ height: ROW_HEIGHT }}>
          <Chip
            label={app.status}
            color={getStatusColor(app.status) as any}
            size="small"
            sx={{ minWidth: 80 }}
          />
        </TableCell>
        <TableCell sx={{ height: ROW_HEIGHT }}>
          <FormControlLabel
            control={
              <Switch
                checked={app.is_featured || false}
                onChange={() => onToggleFeatured(app.id, app.is_featured || false)}
                disabled={updatingFeatured === app.id}
                icon={<StarBorder />}
                checkedIcon={<Star />}
              />
            }
            label=""
          />
        </TableCell>
        <TableCell align="right" sx={{ height: ROW_HEIGHT }}>
          {app.screenshots?.length > 0 && (
            <IconButton
              size="small"
              sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
            >
              <ImageIcon />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => onEdit(app.id)}
            sx={{ mr: 1, '&:hover': { color: 'primary.main' } }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(app)}
            sx={{ '&:hover': { color: 'error.main' } }}
          >
            <Delete />
          </IconButton>
        </TableCell>
      </TableRow>
    )
  }, [apps, selectedApps, onSelectApp, onEdit, onDelete, onToggleFeatured, updatingFeatured])

  return (
    <TableContainer component={Paper} sx={{ height: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={indeterminate}
                checked={allSelected}
                onChange={onSelectAll}
              />
            </TableCell>
            <TableCell>App</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Featured</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
      </Table>
      
      <Box sx={{ height: 600 - 64 }}> {/* Subtract header height */}
        <List
          height={600 - 64}
          itemCount={apps.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {Row}
        </List>
      </Box>
    </TableContainer>
  )
} 