import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '../components/shared/Header'

describe('Header', () => {
  // Rendering tests
  it('renders children content', () => {
    render(
      <Header currentPage="Transactions">
        <div data-testid="child-content">Page Content</div>
      </Header>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('highlights current page in navigation', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    const transactionsLink = screen.getByRole('link', { name: 'Transactions' })
    expect(transactionsLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not highlight non-current pages', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
    expect(dashboardLink).not.toHaveAttribute('aria-current')
  })

  it('hides navigation when hideNav is true', () => {
    render(
      <Header currentPage="Transactions" hideNav={true}>
        <div>Content</div>
      </Header>
    )

    expect(screen.queryByRole('link', { name: 'Transactions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('shows navigation when hideNav is false', () => {
    render(
      <Header currentPage="Dashboard" hideNav={false}>
        <div>Content</div>
      </Header>
    )

    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders notification button when nav is visible', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    expect(screen.getByRole('button', { name: 'View notifications' })).toBeInTheDocument()
  })

  it('hides notification button when hideNav is true', () => {
    render(
      <Header currentPage="Transactions" hideNav={true}>
        <div>Content</div>
      </Header>
    )

    expect(screen.queryByRole('button', { name: 'View notifications' })).not.toBeInTheDocument()
  })

  it('renders logo image', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    const logo = screen.getByAltText('Soraban')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logoipsum-415.svg')
  })

  it('navigation links have correct hrefs', () => {
    render(
      <Header currentPage="Transactions">
        <div>Content</div>
      </Header>
    )

    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})
