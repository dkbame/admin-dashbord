'use client'

import { 
  Box, 
  Button, 
  Typography, 
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import { 
  FirstPage, 
  KeyboardArrowLeft, 
  KeyboardArrowRight, 
  LastPage 
} from '@mui/icons-material'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

interface PaginationControlsProps {
  pagination: PaginationInfo | null
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
}

export default function PaginationControls({ 
  pagination, 
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = false
}: PaginationControlsProps) {
  if (!pagination) return null

  const { 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage, 
    hasNextPage, 
    hasPrevPage 
  } = pagination

  const handleFirstPage = () => {
    if (hasPrevPage) onPageChange(1)
  }

  const handlePrevPage = () => {
    if (hasPrevPage) onPageChange(currentPage - 1)
  }

  const handleNextPage = () => {
    if (hasNextPage) onPageChange(currentPage + 1)
  }

  const handleLastPage = () => {
    if (hasNextPage) onPageChange(totalPages)
  }

  const handleItemsPerPageChange = (event: any) => {
    if (onItemsPerPageChange) {
      onItemsPerPageChange(event.target.value)
    }
  }

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      py: 2,
      px: 2,
      borderTop: 1,
      borderColor: 'divider'
    }}>
      {/* Items info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {startItem}-{endItem} of {totalItems} apps
        </Typography>
        
        {showItemsPerPage && onItemsPerPageChange && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Per page</InputLabel>
            <Select
              value={itemsPerPage}
              label="Per page"
              onChange={handleItemsPerPageChange}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton 
          onClick={handleFirstPage} 
          disabled={!hasPrevPage}
          size="small"
        >
          <FirstPage />
        </IconButton>
        
        <IconButton 
          onClick={handlePrevPage} 
          disabled={!hasPrevPage}
          size="small"
        >
          <KeyboardArrowLeft />
        </IconButton>

        <Typography variant="body2" sx={{ mx: 2 }}>
          Page {currentPage} of {totalPages}
        </Typography>

        <IconButton 
          onClick={handleNextPage} 
          disabled={!hasNextPage}
          size="small"
        >
          <KeyboardArrowRight />
        </IconButton>
        
        <IconButton 
          onClick={handleLastPage} 
          disabled={!hasNextPage}
          size="small"
        >
          <LastPage />
        </IconButton>
      </Box>
    </Box>
  )
} 