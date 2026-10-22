import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../runtime';

export interface EmployeeOption {
  id: string;
  name: string;
}

export interface EmployeeSelectProps {
  label: string;
  description?: string;
  placeholder?: string;
  value: string | null;
  /** The selected employee, so its name shows before any search has loaded it. */
  selected?: EmployeeOption | null;
  onChange: (value: string | null) => void;
  /** Employees that can't be chosen (e.g. the employee being edited). */
  exclude?: ReadonlySet<string>;
  error?: string;
}

/** Picks a current (not exited) employee, searching by name, email or code on the server. */
export function EmployeeSelect({
  label,
  description,
  placeholder = 'Search by name or code',
  value,
  selected,
  onChange,
  exclude,
  error,
}: EmployeeSelectProps) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<EmployeeOption | null>(selected ?? null);
  // After a choice, the input shows the chosen name: that is not a new search
  const term = search === chosen?.name ? '' : search.trim();
  const [debounced] = useDebouncedValue(term, 250);
  const results = api.query.useQuery(
    'get',
    '/api/v1/employees',
    { params: { query: { search: debounced || undefined, size: 20 } } },
    { placeholderData: keepPreviousData },
  );

  const options = new Map<string, string>();
  if (chosen && chosen.id === value) {
    options.set(chosen.id, chosen.name);
  }
  for (const employee of results.data?.content ?? []) {
    if (employee.id && employee.employmentStatus !== 'EXITED' && !exclude?.has(employee.id)) {
      options.set(employee.id, employee.fullName ?? employee.email ?? employee.id);
    }
  }

  return (
    <Select
      label={label}
      description={description}
      placeholder={placeholder}
      data={[...options.entries()].map(([id, name]) => ({ value: id, label: name }))}
      value={value}
      onChange={(id, option) => {
        setChosen(id && option ? { id, name: option.label } : null);
        onChange(id);
      }}
      searchable
      clearable
      searchValue={search}
      onSearchChange={setSearch}
      // The server already filtered by the search
      filter={({ options: all }) => all}
      nothingFoundMessage={results.isFetching ? 'Searching…' : 'No employees match'}
      error={error}
    />
  );
}
