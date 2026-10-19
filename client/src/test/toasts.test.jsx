// Tests for Toast notification system:
// - Success, Error, and Info variant rendering and styling
// - Accessibility attributes (role="status", aria-label="Dismiss")
// - Manual dismissal
// - Automatic dismissal with default (4000ms) and custom timeouts
// - Multiple toast stacking and independent dismissal
// - Empty container rendering (null when empty)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../context/ToastContext.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { useToast } from '../context/useToast.js';

function ToastTestHarness() {
  const { showSuccess, showError, showInfo } = useToast();

  return (
    <div>
      <button type="button" onClick={() => showSuccess('Action completed successfully')}>
        Trigger Success
      </button>
      <button type="button" onClick={() => showError('Failed to save record')}>
        Trigger Error
      </button>
      <button type="button" onClick={() => showInfo('New system update available')}>
        Trigger Info
      </button>
      <button type="button" onClick={() => showSuccess('Quick auto-dismiss', 1500)}>
        Trigger Custom Duration
      </button>
      <button
        type="button"
        onClick={() => {
          showSuccess('Toast First');
          showError('Toast Second');
          showInfo('Toast Third');
        }}
      >
        Trigger Stack
      </button>
    </div>
  );
}

function renderToastEnvironment() {
  return render(
    <ToastProvider>
      <ToastContainer />
      <ToastTestHarness />
    </ToastProvider>
  );
}

describe('Toast Notification System', () => {
  describe('Rendering, Styling & Accessibility', () => {
    it('renders null when there are no active toasts', () => {
      renderToastEnvironment();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders success toast with emerald theme, status role, and dismiss label', async () => {
      const user = userEvent.setup();
      renderToastEnvironment();

      await user.click(screen.getByRole('button', { name: /trigger success/i }));

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent('Action completed successfully');

      // Verify emerald styling classes
      expect(toast.className).toContain('bg-emerald-50');
      expect(toast.className).toContain('border-emerald-200');
      expect(toast.className).toContain('text-emerald-800');

      // Accessibility: dismiss button has proper aria-label
      const dismissBtn = within(toast).getByRole('button', { name: /dismiss/i });
      expect(dismissBtn).toBeInTheDocument();
    });

    it('renders error toast with red theme and status role', async () => {
      const user = userEvent.setup();
      renderToastEnvironment();

      await user.click(screen.getByRole('button', { name: /trigger error/i }));

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent('Failed to save record');

      // Verify red styling classes
      expect(toast.className).toContain('bg-red-50');
      expect(toast.className).toContain('border-red-200');
      expect(toast.className).toContain('text-red-800');
    });

    it('renders info toast with indigo theme and status role', async () => {
      const user = userEvent.setup();
      renderToastEnvironment();

      await user.click(screen.getByRole('button', { name: /trigger info/i }));

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent('New system update available');

      // Verify indigo styling classes
      expect(toast.className).toContain('bg-indigo-50');
      expect(toast.className).toContain('border-indigo-200');
      expect(toast.className).toContain('text-indigo-800');
    });
  });

  describe('Manual Dismissal', () => {
    it('removes toast immediately when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      renderToastEnvironment();

      await user.click(screen.getByRole('button', { name: /trigger success/i }));
      expect(screen.getByText('Action completed successfully')).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissBtn);

      expect(screen.queryByText('Action completed successfully')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Automatic Dismissal with Fake Timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('automatically dismisses toast after default duration (4000ms)', () => {
      renderToastEnvironment();

      fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
      expect(screen.getByText('Action completed successfully')).toBeInTheDocument();

      // At 3999ms, toast should still be visible
      act(() => {
        vi.advanceTimersByTime(3999);
      });
      expect(screen.getByText('Action completed successfully')).toBeInTheDocument();

      // At 4000ms, toast dismisses
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByText('Action completed successfully')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('automatically dismisses toast after custom configured duration (1500ms)', () => {
      renderToastEnvironment();

      fireEvent.click(screen.getByRole('button', { name: /trigger custom duration/i }));
      expect(screen.getByText('Quick auto-dismiss')).toBeInTheDocument();

      // At 1499ms, still present
      act(() => {
        vi.advanceTimersByTime(1499);
      });
      expect(screen.getByText('Quick auto-dismiss')).toBeInTheDocument();

      // At 1500ms, dismisses
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByText('Quick auto-dismiss')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Toast Stacking & Independent Dismissal', () => {
    it('stacks multiple toasts and allows independent dismissal', async () => {
      const user = userEvent.setup();
      renderToastEnvironment();

      await user.click(screen.getByRole('button', { name: /trigger stack/i }));

      const allToasts = screen.getAllByRole('status');
      expect(allToasts).toHaveLength(3);

      expect(screen.getByText('Toast First')).toBeInTheDocument();
      expect(screen.getByText('Toast Second')).toBeInTheDocument();
      expect(screen.getByText('Toast Third')).toBeInTheDocument();

      // Dismiss the middle toast (Toast Second)
      const secondToast = screen.getByText('Toast Second').closest('[role="status"]');
      const dismissSecondBtn = within(secondToast).getByRole('button', { name: /dismiss/i });
      await user.click(dismissSecondBtn);

      // Toast Second is removed, others remain
      expect(screen.queryByText('Toast Second')).not.toBeInTheDocument();
      expect(screen.getByText('Toast First')).toBeInTheDocument();
      expect(screen.getByText('Toast Third')).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(2);

      // Dismiss Toast First
      const firstToast = screen.getByText('Toast First').closest('[role="status"]');
      const dismissFirstBtn = within(firstToast).getByRole('button', { name: /dismiss/i });
      await user.click(dismissFirstBtn);

      expect(screen.queryByText('Toast First')).not.toBeInTheDocument();
      expect(screen.getByText('Toast Third')).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });
  });
});
