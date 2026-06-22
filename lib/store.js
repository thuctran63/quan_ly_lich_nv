import { getSchedules } from './mongodb.js';

const memory = { data: null };

export function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}

function fresh() {
  return { date: todayStr(), employees: [], assignments: [] };
}

async function purgeOld(col) {
  await col.deleteMany({ _id: { $lt: todayStr() } });
}

export async function readState() {
  const today = todayStr();
  const col = await getSchedules();

  if (!col) {
    if (!memory.data || memory.data.date !== today) memory.data = fresh();
    return memory.data;
  }

  await purgeOld(col);
  const doc = await col.findOne({ _id: today });
  if (doc) {
    return {
      date: doc.date,
      employees: doc.employees ?? [],
      assignments: doc.assignments ?? [],
    };
  }
  return fresh();
}

export async function writeState(state) {
  const col = await getSchedules();

  if (!col) {
    memory.data = state;
    return;
  }

  await col.updateOne(
    { _id: state.date },
    {
      $set: {
        date: state.date,
        employees: state.employees,
        assignments: state.assignments,
      },
    },
    { upsert: true }
  );
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
