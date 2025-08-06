'use client'

import { 
  useState, 
  useEffect 
} from 'react'
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Apple as AppleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material'

interface iTunesMatchResult {
  appId: string
  appName: string
  found: boolean
  confidence: number
  masId?: string
  masUrl?: string
  error?: string
  autoApplied: boolean
}

interface iTunesMatchingPanelProps {
  selectedAppIds: string[]
  onComplete?: () => void
}

export default function iTunesMatchingPanel({ 
  selectedAppIds, 
  onComplete 
}: iTunesMatchingPanelProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<iTunesMatchResult[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  const handleStartMatching = async () => {
    if (selectedAppIds.length === 0) {
      setError('Please select apps to match')
      return
    }

    setIsRunning(true)
    setProgress(0)
    setResults([])
    setError(null)

    try {
      console.log('Starting iTunes matching for:', selectedAppIds)

      const response = await fetch('/api/itunes-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appIds: selectedAppIds,
          autoApply: true // Auto-apply high-confidence matches
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start matching')
      }

      setResults(data.results || [])
      setSummary(data.summary || {})

      console.log('iTunes matching completed:', data)

      if (onComplete) {
        onComplete()
      }

    } catch (err) {
      console.error('iTunes matching error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const handleStopMatching = () => {
    setIsRunning(false)
    setProgress(0)
  }

  const getStatusIcon = (result: iTunesMatchResult) => {
    if (result.autoApplied) {
      return <CheckCircleIcon color="success" />
    } else if (result.found) {
      return <InfoIcon color="info" />
    } else {
      return <ErrorIcon color="error" />
    }
  }

  const getStatusText = (result: iTunesMatchResult) => {
    if (result.autoApplied) {
      return 'Auto-applied'
    } else if (result.found) {
      return 'Found (Manual review needed)'
    } else {
      return 'Not found'
    }
  }

  const getStatusColor = (result: iTunesMatchResult) => {
    if (result.autoApplied) {
      return 'success'
    } else if (result.found) {
      return 'info'
    } else {
      return 'error'
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AppleIcon color="primary" />
            <Typography variant="h6">
              iTunes Matching
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isRunning ? (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartMatching}
                disabled={selectedAppIds.length === 0}
              >
                Check for iTunes Match
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<StopIcon />}
                onClick={handleStopMatching}
                color="error"
              >
                Stop
              </Button>
            )}
            
            {results.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => setShowResults(true)}
              >
                View Results
              </Button>
            )}
          </Box>
        </Box>

        {selectedAppIds.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedAppIds.length} app{selectedAppIds.length !== 1 ? 's' : ''} selected
          </Typography>
        )}

        {isRunning && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Searching iTunes API... ({progress}%)
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {summary && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Total: ${summary.total}`} 
              variant="outlined" 
              size="small" 
            />
            <Chip 
              label={`Found: ${summary.found}`} 
              color="info" 
              size="small" 
            />
            <Chip 
              label={`Auto-applied: ${summary.autoApplied}`} 
              color="success" 
              size="small" 
            />
            <Chip 
              label={`Failed: ${summary.failed}`} 
              color="error" 
              size="small" 
            />
          </Box>
        )}

        {/* Results Dialog */}
        <Dialog 
          open={showResults} 
          onClose={() => setShowResults(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            iTunes Matching Results
          </DialogTitle>
          <DialogContent>
            <List>
              {results.map((result, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {getStatusIcon(result)}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.appName}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {getStatusText(result)}
                        </Typography>
                        {result.found && (
                          <Typography variant="body2" color="text.secondary">
                            Confidence: {(result.confidence * 100).toFixed(1)}%
                          </Typography>
                        )}
                        {result.masUrl && (
                          <Typography variant="body2" color="text.secondary">
                            <a href={result.masUrl} target="_blank" rel="noopener noreferrer">
                              View on Mac App Store
                            </a>
                          </Typography>
                        )}
                        {result.error && (
                          <Typography variant="body2" color="error">
                            Error: {result.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip 
                    label={getStatusText(result)}
                    color={getStatusColor(result) as any}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResults(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
} 