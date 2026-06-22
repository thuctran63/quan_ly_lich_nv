import './style.css';

const STORAGE_KEY = 'phungnong_schedule';
const DAY_MINUTES = 1440;
const LANE_HEIGHT = 28;
const LANE_GAP = 4;
const ROW_PADDING = 8;

const $ = (sel) => document.querySelector(sel);

let state = loadState();

function todayStr() {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local
}

function formatDateVi(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function loadState() {
  const today = todayStr();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) return parsed;
    }
  } catch {
    /* ponytail: corrupt storage → fresh day */
  }
  const fresh = { date: today, employees: [], assignments: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseEmployees(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function minutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

/** Gán mỗi block vào lane đầu tiên còn trống (cho phép chồng giờ). */
function assignLanes(items) {
  const sorted = [...items].sort((a, b) => minutes(a.start) - minutes(b.start));
  const lanes = [];

  for (const item of sorted) {
    const start = minutes(item.start);
    const end = minutes(item.end);
    let placed = false;

    for (let i = 0; i < lanes.length; i++) {
      const lastEnd = lanes[i][lanes[i].length - 1]._end;
      if (start >= lastEnd) {
        lanes[i].push({ ...item, lane: i, _start: start, _end: end });
        placed = true;
        break;
      }
    }

    if (!placed) {
      lanes.push([{ ...item, lane: lanes.length, _start: start, _end: end }]);
    }
  }

  return lanes.flat();
}

function showError(msg) {
  const el = $('#form-error');
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function updateEmployeeSelect() {
  const sel = $('#employee-select');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Chọn nhân viên —</option>';
  for (const name of state.employees) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  }
  if (state.employees.includes(prev)) sel.value = prev;
}

function renderAssignmentList() {
  const container = $('#assignment-list');
  if (!state.assignments.length) {
    container.innerHTML = '<p class="empty">Chưa có lịch nào.</p>';
    return;
  }

  container.innerHTML = '';
  const sorted = [...state.assignments].sort(
    (a, b) => minutes(a.start) - minutes(b.start) || a.employee.localeCompare(b.employee)
  );

  for (const a of sorted) {
    const div = document.createElement('div');
    div.className = 'assignment-item';
    div.innerHTML = `
      <span>
        <strong>${esc(a.employee)}</strong><br />
        ${esc(a.start)} – ${esc(a.end)}<br />
        ${esc(a.task)}
      </span>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.textContent = 'Xóa';
    btn.addEventListener('click', () => deleteAssignment(a.id));
    div.appendChild(btn);
    container.appendChild(div);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderTimeline() {
  const container = $('#timeline');

  if (!state.employees.length) {
    container.innerHTML = '<p class="empty">Lưu danh sách nhân viên để hiển thị timeline.</p>';
    return;
  }

  const inner = document.createElement('div');
  inner.className = 'timeline-inner';

  // Time axis
  const axis = document.createElement('div');
  axis.className = 'time-axis';
  axis.innerHTML = '<div class="time-axis-label"></div>';
  const ticks = document.createElement('div');
  ticks.className = 'time-axis-ticks';
  for (let h = 0; h <= 24; h += 2) {
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.left = `${(h / 24) * 100}%`;
    tick.textContent = h === 24 ? '24:00' : `${h}:00`;
    ticks.appendChild(tick);
  }
  axis.appendChild(ticks);
  inner.appendChild(axis);

  for (const emp of state.employees) {
    const row = document.createElement('div');
    row.className = 'timeline-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = emp;

    const track = document.createElement('div');
    track.className = 'row-track';

    const empAssignments = state.assignments.filter((a) => a.employee === emp);
    const withLanes = assignLanes(empAssignments);
    const maxLane = withLanes.reduce((m, a) => Math.max(m, a.lane), 0);
    const trackHeight = ROW_PADDING * 2 + (maxLane + 1) * LANE_HEIGHT + maxLane * LANE_GAP;
    track.style.height = `${Math.max(44, trackHeight)}px`;

    for (const a of withLanes) {
      const block = document.createElement('div');
      block.className = 'time-block';
      const leftPct = (a._start / DAY_MINUTES) * 100;
      const widthPct = ((a._end - a._start) / DAY_MINUTES) * 100;
      block.style.left = `${leftPct}%`;
      block.style.width = `${widthPct}%`;
      block.style.top = `${ROW_PADDING + a.lane * (LANE_HEIGHT + LANE_GAP)}px`;
      block.style.height = `${LANE_HEIGHT}px`;
      block.style.background = hashColor(emp);
      block.dataset.tip = `${a.task} — Từ ${a.start} đến ${a.end}`;
      block.innerHTML = `<span>${esc(a.task)}</span>`;
      track.appendChild(block);
    }

    row.appendChild(label);
    row.appendChild(track);
    inner.appendChild(row);
  }

  container.innerHTML = '';
  container.appendChild(inner);
}

function render() {
  $('#current-date').textContent = formatDateVi(state.date);
  $('#employees-input').value = state.employees.join('\n');
  $('#employee-count').textContent = `${state.employees.length} nhân viên`;
  updateEmployeeSelect();
  renderAssignmentList();
  renderTimeline();
}

function saveEmployees() {
  const names = parseEmployees($('#employees-input').value);
  if (!names.length) {
    showError('Nhập ít nhất một nhân viên.');
    return;
  }
  showError('');
  state.employees = names;
  state.assignments = state.assignments.filter((a) => names.includes(a.employee));
  saveState();
  render();
}

function addAssignment(employee, start, end, task) {
  if (!state.employees.length) {
    showError('Lưu danh sách nhân viên trước.');
    return false;
  }
  if (!state.employees.includes(employee)) {
    showError('Nhân viên không có trong danh sách.');
    return false;
  }
  const startMin = minutes(start);
  const endMin = minutes(end);
  if (endMin <= startMin) {
    showError('Giờ kết thúc phải sau giờ bắt đầu.');
    return false;
  }
  if (!task.trim()) {
    showError('Nhập mô tả công việc.');
    return false;
  }

  state.assignments.push({
    id: uid(),
    employee,
    start,
    end,
    task: task.trim(),
  });
  saveState();
  showError('');
  render();
  return true;
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter((a) => a.id !== id);
  saveState();
  render();
}

function bindEvents() {
  $('#save-employees').addEventListener('click', saveEmployees);

  $('#assignment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addAssignment(
      $('#employee-select').value,
      $('#start-time').value,
      $('#end-time').value,
      $('#task-input').value
    );
  });
}

bindEvents();
render();

// ponytail: self-check lane packing
if (import.meta.env.DEV) {
  const lanes = assignLanes([
    { start: '08:00', end: '10:00' },
    { start: '09:00', end: '11:00' },
    { start: '09:30', end: '10:30' },
  ]);
  console.assert(lanes[0].lane === 0 && lanes[1].lane === 1 && lanes[2].lane === 0, 'lane packing ok');
}
