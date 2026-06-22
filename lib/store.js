import { getSchedules } from './mongodb.js';
import { todayStr, ApiError } from './handler.js';

const memory = { data: null };

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
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!cleaned.length) throw new ApiError('Cần ít nhất một nhân viên');

  const state = await readState();
  state.employees = cleaned;
  state.assignments = state.assignments.filter((a) => cleaned.includes(a.employee));
  await writeState(state);
  return state;
}

function cleanName(name) {
  const n = name?.trim();
  if (!n) throw new ApiError('Tên nhân viên không được trống');
  return n;
}

export async function addEmployee(name) {
  const n = cleanName(name);
  const state = await readState();
  if (state.employees.includes(n)) throw new ApiError('Nhân viên đã tồn tại');
  state.employees.push(n);
  await writeState(state);
  return state;
}

export async function renameEmployee(oldName, newName) {
  const next = cleanName(newName);
  const state = await readState();
  const idx = state.employees.indexOf(oldName);
  if (idx === -1) throw new ApiError('Không tìm thấy nhân viên');
  if (state.employees.includes(next) && next !== oldName) {
    throw new ApiError('Tên nhân viên đã tồn tại');
  }
  state.employees[idx] = next;
  state.assignments.forEach((a) => {
    if (a.employee === oldName) a.employee = next;
  });
  await writeState(state);
  return state;
}

export async function removeEmployee(name) {
  const state = await readState();
  if (!state.employees.includes(name)) throw new ApiError('Không tìm thấy nhân viên');
  state.employees = state.employees.filter((e) => e !== name);
  state.assignments = state.assignments.filter((a) => a.employee !== name);
  await writeState(state);
  return state;
}

export async function addAssignment(assignment) {
  const state = await readState();
  if (!state.employees.includes(assignment.employee)) {
    throw new ApiError('Nhân viên không có trong danh sách');
  }
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

export { todayStr };
