// Tests for NotFoundPage:
// - 404 code, heading, and explanatory message rendering
// - "Back to Dashboard" navigation link and target destination
// - Wildcard routing integration for unmapped paths

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { renderWithProviders } from './testUtils.jsx';

describe('NotFoundPage', () => {
  function renderNotFound(initialRoute = '/non-existent-page') {
    return renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Dashboard Home Page</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>,
      { route: initialRoute }
    );
  }

  it('renders 404 code, "Page not found" heading, and descriptive message', () => {
    renderNotFound();

    // 404 badge/text
    expect(screen.getByText('404')).toBeInTheDocument();

    // Main heading
    const heading = screen.getByRole('heading', { name: /page not found/i, level: 2 });
    expect(heading).toBeInTheDocument();

    // Descriptive explanation
    expect(
      screen.getByText('The page you requested doesn’t exist.')
    ).toBeInTheDocument();
  });

  it('renders "Back to Dashboard" link pointing to the root dashboard route ("/")', () => {
    renderNotFound();

    const backLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('navigates to Dashboard when "Back to Dashboard" is clicked', async () => {
    const user = userEvent.setup();
    renderNotFound('/invalid/path/test');

    expect(screen.getByRole('heading', { name: /page not found/i, level: 2 })).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /back to dashboard/i });
    await user.click(backLink);

    expect(screen.getByText('Dashboard Home Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /page not found/i, level: 2 })).not.toBeInTheDocument();
  });

  it('catches arbitrary unmatched nested URLs via wildcard route', () => {
    renderNotFound('/departments/9999/unknown/subpath');

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /page not found/i, level: 2 })).toBeInTheDocument();
  });
});
