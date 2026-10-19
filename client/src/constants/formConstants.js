// Initial empty form state constants for Department and KPI creation/editing modals.

export const EMPTY_DEPARTMENT_FORM = {
  name: '',
  code: '',
  head: '',
  description: '',
  status: 'active',
};

export const EMPTY_KPI_FORM = {
  name: '',
  code: '',
  department: '',
  unit: '%',
  target: '',
  currentValue: '0',
  status: 'on_track',
  period: 'monthly',
  owner: '',
  statusRule: 'higher_is_better',
};
