import 'dotenv/config';
import { readState, saveEmployees, addAssignment, deleteAssignment } from './lib/store.js';
import { randomUUID } from 'crypto';

const base = process.argv[2] || 'http://localhost:5173/api';
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log('✓', name);
    passed++;
  } catch (e) {
    console.log('✗', name, '-', e.message);
    failed++;
  }
}

async function api(path, options) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

console.log('Testing', base, '\n');

await test('GET /state', async () => {
  const d = await api('/state');
  if (!d.date) throw new Error('missing date');
});

await test('PUT /employees', async () => {
  const d = await api('/employees', {
    method: 'PUT',
    body: JSON.stringify({ employees: ['Nguyen Van A', 'Tran Thi B'] }),
  });
  if (d.employees.length !== 2) throw new Error('not saved');
});

await test('POST /assignments', async () => {
  const d = await api('/assignments', {
    method: 'POST',
    body: JSON.stringify({
      employee: 'Nguyen Van A',
      start: '08:30',
      end: '10:00',
      task: 'Di cho',
    }),
  });
  if (d.assignments.length !== 1) throw new Error('not added');
  globalThis.__testId = d.assignments[0].id;
});

await test('POST overlapping assignment', async () => {
  const d = await api('/assignments', {
    method: 'POST',
    body: JSON.stringify({
      employee: 'Nguyen Van A',
      start: '09:00',
      end: '11:00',
      task: 'Hop',
    }),
  });
  if (d.assignments.length !== 2) throw new Error('overlap not saved');
});

await test('DELETE /assignments/:id', async () => {
  const d = await api(`/assignments/${globalThis.__testId}`, { method: 'DELETE' });
  if (d.assignments.length !== 1) throw new Error('not deleted');
});

await test('reject invalid time', async () => {
  const res = await fetch(`${base}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee: 'Nguyen Van A', start: '12:00', end: '10:00', task: 'X' }),
  });
  if (res.ok) throw new Error('should fail');
});

await test('reject unknown employee', async () => {
  try {
    await api('/assignments', {
      method: 'POST',
      body: JSON.stringify({ employee: 'Ghost', start: '08:00', end: '09:00', task: 'X' }),
    });
    throw new Error('should fail');
  } catch (e) {
    if (e.message === 'should fail') throw e;
  }
});

await test('MongoDB direct read', async () => {
  const d = await readState();
  if (!d.employees.length) throw new Error('mongo empty');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
