import { kv } from '@vercel/kv';

const memory = { data: null };

export function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}

function fresh() {
  return { date: todayStr(), employees: [], assignments: [] };
}

function kvKey() {
  return `schedule:${todayStr()}`;
}

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function readState() {
  const today = todayStr();

  if (hasKv()) {
    const data = await kv.get(kvKey());
    return data?.date === today ? data : fresh();
  }

  // ponytail: in-memory khi chưa gắn Vercel KV — chỉ để dev local
  if (!memory.data || memory.data.date !== today) memory.data = fresh();
  return memory.data;
}

export async function writeState(state) {
  if (hasKv()) {
    await kv.set(kvKey(), state);
  } else {
    memory.data = state;
  }
}

export async function saveEmployees(names) {
  const state = await readState();
  state.employees = names;
  state.assignments = state.assignments.filter((a) => names.includes(a.employee));
  await writeState(state);
  return state;
}

export async function addAssignment(assignment) {
  const state = await readState();
  state.assignments.push(assignment);
  await writeState(state);
  return state;
}

export async function deleteAssignment(id) {
  const state = await readState();
  state.assignments = state.assignments.filter((a) => a.id !== id);
  await writeState(state);
  return state;
}
