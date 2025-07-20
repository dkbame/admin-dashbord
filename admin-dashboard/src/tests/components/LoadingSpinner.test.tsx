import { render, screen } from '@testing-library/react'
import LoadingSpinner from '@/components/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders default spinner with message', () => {
    render(<LoadingSpinner message="Loading apps..." />)
    
    expect(screen.getByText('Loading apps...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders without message', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('renders skeleton variant', () => {
    render(<LoadingSpinner variant="skeleton" />)
    
    // Check for skeleton elements
    const skeletonElements = screen.getAllByTestId('skeleton')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('renders fullscreen variant', () => {
    render(<LoadingSpinner variant="fullscreen" fullHeight />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    const container = screen.getByRole('progressbar').closest('div')
    expect(container).toHaveStyle({ minHeight: '100vh' })
  })

  it('renders different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="small" />)
    let spinner = screen.getByRole('progressbar')
    expect(spinner).toHaveStyle({ width: '24px', height: '24px' })

    rerender(<LoadingSpinner size="large" />)
    spinner = screen.getByRole('progressbar')
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' })
  })
})

describe('TableLoadingSkeleton', () => {
  it('renders correct number of rows', () => {
    render(<LoadingSpinner.TableLoadingSkeleton rows={3} />)
    
    const skeletonRows = screen.getAllByTestId('skeleton-row')
    expect(skeletonRows).toHaveLength(3)
  })

  it('renders default 5 rows', () => {
    render(<LoadingSpinner.TableLoadingSkeleton />)
    
    const skeletonRows = screen.getAllByTestId('skeleton-row')
    expect(skeletonRows).toHaveLength(5)
  })
})

describe('CardLoadingSkeleton', () => {
  it('renders correct number of cards', () => {
    render(<LoadingSpinner.CardLoadingSkeleton cards={4} />)
    
    const skeletonCards = screen.getAllByTestId('skeleton-card')
    expect(skeletonCards).toHaveLength(4)
  })

  it('renders default 3 cards', () => {
    render(<LoadingSpinner.CardLoadingSkeleton />)
    
    const skeletonCards = screen.getAllByTestId('skeleton-card')
    expect(skeletonCards).toHaveLength(3)
  })
})

describe('FormLoadingSkeleton', () => {
  it('renders correct number of fields', () => {
    render(<LoadingSpinner.FormLoadingSkeleton fields={7} />)
    
    const skeletonFields = screen.getAllByTestId('skeleton-field')
    expect(skeletonFields).toHaveLength(7)
  })

  it('renders default 5 fields', () => {
    render(<LoadingSpinner.FormLoadingSkeleton />)
    
    const skeletonFields = screen.getAllByTestId('skeleton-field')
    expect(skeletonFields).toHaveLength(5)
  })
}) 