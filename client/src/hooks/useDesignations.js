// hooks/useDesignations.js
// ─── Single source of truth for staff designations ───────────────────────────
// Reads from localStorage 'glamour_designations', falls back to defaults.
// Any component that imports this hook will always get the latest list.

import { useState, useEffect, useCallback } from 'react';

export const DEFAULT_DESIGNATIONS = [
  { key: 'trainee',        label: 'Trainee',        defaultCommission: 5,  rank: 1 },
  { key: 'junior_stylist', label: 'Junior Stylist',  defaultCommission: 8,  rank: 2 },
  { key: 'senior_stylist', label: 'Senior Stylist',  defaultCommission: 12, rank: 3 },
  { key: 'master_stylist', label: 'Master Stylist',  defaultCommission: 15, rank: 4 },
  { key: 'receptionist',   label: 'Receptionist',    defaultCommission: 6,  rank: 2 },
  { key: 'manager',        label: 'Manager',         defaultCommission: 18, rank: 5 },
];

const STORAGE_KEY = 'glamour_designations';

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_DESIGNATIONS;
};

const save = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
};

// ── hook ─────────────────────────────────────────────────────────────────────
export function useDesignations() {
  const [designations, setDesignations] = useState(load);

  // sync across tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY) setDesignations(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addDesignation = useCallback((item) => {
    // item: { label, defaultCommission, rank }
    const key = item.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const updated = [...designations, { ...item, key }];
    save(updated);
    setDesignations(updated);
    return key;
  }, [designations]);

  const updateDesignation = useCallback((key, patch) => {
    const updated = designations.map(d => d.key === key ? { ...d, ...patch } : d);
    save(updated);
    setDesignations(updated);
  }, [designations]);

  const deleteDesignation = useCallback((key) => {
    // don't delete if it's a default
    const updated = designations.filter(d => d.key !== key);
    save(updated);
    setDesignations(updated);
  }, [designations]);

  const resetToDefaults = useCallback(() => {
    save(DEFAULT_DESIGNATIONS);
    setDesignations(DEFAULT_DESIGNATIONS);
  }, []);

  // map form: { key -> { label, defaultCommission, rank } }
  const desgMap = Object.fromEntries(designations.map(d => [d.key, d]));

  return { designations, desgMap, addDesignation, updateDesignation, deleteDesignation, resetToDefaults };
}

// ── salary record helpers (localStorage) ─────────────────────────────────────
const SAL_KEY = 'glamour_salary_records';

export const getSalaryRecords = (staffId) => {
  try {
    const all = JSON.parse(localStorage.getItem(SAL_KEY) || '{}');
    return all[staffId] || [];
  } catch { return []; }
};

export const saveSalaryRecord = (staffId, record) => {
  try {
    const all = JSON.parse(localStorage.getItem(SAL_KEY) || '{}');
    const existing = all[staffId] || [];
    const updated = [record, ...existing].slice(0, 60); // keep last 60 records
    all[staffId] = updated;
    localStorage.setItem(SAL_KEY, JSON.stringify(all));
    return updated;
  } catch { return []; }
};

export const deleteSalaryRecord = (staffId, recordId) => {
  try {
    const all = JSON.parse(localStorage.getItem(SAL_KEY) || '{}');
    const existing = all[staffId] || [];
    all[staffId] = existing.filter(r => r.id !== recordId);
    localStorage.setItem(SAL_KEY, JSON.stringify(all));
    return all[staffId];
  } catch { return []; }
};

export const getLastPaid = (staffId) => {
  const records = getSalaryRecords(staffId);
  const paid = records.filter(r => r.type === 'payment');
  return paid.length > 0 ? paid[0] : null;
};