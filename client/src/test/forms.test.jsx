// Tests for department, KPI, and quick-value modals.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepartmentFormModal from '../components/departments/DepartmentFormModal.jsx';
import KpiFormModal from '../components/kpis/KpiFormModal.jsx';
import { EMPTY_DEPARTMENT_FORM, EMPTY_KPI_FORM } from '../constants/formConstants.js';
import QuickValueModal from '../components/kpis/QuickValueModal.jsx';
import { renderWithProviders } from './testUtils.jsx';

describe('Department and KPI Modals', () => {
  describe('DepartmentFormModal', () => {
    it('validates required name and code lengths before submission', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <DepartmentFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          initialValues={EMPTY_DEPARTMENT_FORM}
        />
      );

      // Click save on empty form
      const submitBtn = screen.getByRole('button', { name: /create department/i });
      await user.click(submitBtn);

      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/code must be 2-10 characters/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('submits valid department details with uppercase code', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <DepartmentFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          initialValues={EMPTY_DEPARTMENT_FORM}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Operations');
      await user.type(screen.getByLabelText(/code/i), 'ops');
      await user.type(screen.getByLabelText(/head of department/i), 'John Doe');
      await user.type(screen.getByLabelText(/description/i), 'Handles company operations');

      const submitBtn = screen.getByRole('button', { name: /create department/i });
      await user.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Operations',
          code: 'OPS',
          head: 'John Doe',
          description: 'Handles company operations',
          status: 'active',
        })
      );
    });
  });

  describe('KpiFormModal', () => {
    const mockDepartments = [
      { _id: 'dept-1', name: 'Engineering', code: 'ENG' },
      { _id: 'dept-2', name: 'Finance', code: 'FIN' },
    ];

    it('validates required fields: name, code, department, target', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <KpiFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          initialValues={EMPTY_KPI_FORM}
          mode="create"
          departments={mockDepartments}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /create kpi/i });
      await user.click(submitBtn);

      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/code must be 2-20 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/department is required/i)).toBeInTheDocument();
      expect(screen.getByText(/target must be a non-negative number/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('submits valid KPI payload with department, unit, and period', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <KpiFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          initialValues={EMPTY_KPI_FORM}
          mode="create"
          departments={mockDepartments}
        />
      );

      await user.type(screen.getByLabelText(/^name/i), 'Revenue Growth');
      await user.type(screen.getByLabelText(/^code/i), 'FIN-REV');
      await user.selectOptions(screen.getByLabelText(/department/i), 'dept-2');
      await user.type(screen.getByLabelText(/^target/i), '500000');
      await user.selectOptions(screen.getByLabelText(/^period/i), 'quarterly');

      const submitBtn = screen.getByRole('button', { name: /create kpi/i });
      await user.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Revenue Growth',
          code: 'FIN-REV',
          department: 'dept-2',
          target: '500000',
          period: 'quarterly',
        })
      );
    });
  });

  describe('QuickValueModal', () => {
    const mockKpi = {
      _id: 'kpi-99',
      name: 'Monthly Active Users',
      currentValue: 12000,
      status: 'on_track',
      unit: 'users',
    };

    it('pre-fills current value and status from KPI', () => {
      renderWithProviders(
        <QuickValueModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          kpi={mockKpi}
        />
      );

      expect(screen.getByText(/update kpi value: monthly active users/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('12000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('On Track')).toBeInTheDocument();
    });

    it('validates non-negative number input', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <QuickValueModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          kpi={mockKpi}
        />
      );

      const input = screen.getByLabelText(/current value/i);
      await user.clear(input);
      await user.type(input, '-15');

      const saveBtn = screen.getByRole('button', { name: /update value/i });
      await user.click(saveBtn);

      expect(screen.getByText(/current value must be a non-negative number/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('submits updated currentValue and status', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      renderWithProviders(
        <QuickValueModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          kpi={mockKpi}
        />
      );

      const input = screen.getByLabelText(/current value/i);
      await user.clear(input);
      await user.type(input, '15500');

      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'completed');

      const saveBtn = screen.getByRole('button', { name: /update value/i });
      await user.click(saveBtn);

      expect(handleSubmit).toHaveBeenCalledWith({
        currentValue: 15500,
        status: 'completed',
      });
    });
  });
});
