import './style.css';

const API = '/api';
const DAY_MINUTES = 1440;
const LANE_HEIGHT = 28;
const LANE_GAP = 4;
const ROW_PADDING = 8;
const LABEL_WIDTH = 140;

const $ = (sel) => document.querySelector(sel);

let state = { date: '', employees: [], assignments: [] };
let nowLineEl = null;
let editingEmployee = null;

function formatDateVi(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

async function api(path, options) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi kết nối server');
  return data;
}

async function loadState() {
  state = await api('/state');
}

function minutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

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

function showEmployeeError(msg) {
  const el = $('#employee-error');
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  toast(msg, 'error');
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
  toast(msg, 'error');
}

let toastTimer;
function toast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast--show'), 3000);
}

async function withLoading(btn, fn) {
  if (!btn) return fn();
  btn.disabled = true;
  btn.classList.add('btn--loading');
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.classList.remove('btn--loading');
  }
}

function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.classList.toggle('nav-tab--active', btn.dataset.tab === tab);
  });
  $('#tab-employees').hidden = tab !== 'employees';
  $('#tab-schedule').hidden = tab !== 'schedule';
  $('#tab-employees').classList.toggle('tab-panel--active', tab === 'employees');
  $('#tab-schedule').classList.toggle('tab-panel--active', tab === 'schedule');
}

function resetEmployeeForm() {
  editingEmployee = null;
  $('#employee-form-title').textContent = 'Thêm nhân viên';
  $('#employee-submit').textContent = 'Thêm nhân viên';
  $('#employee-cancel').hidden = true;
  $('#employee-name-input').value = '';
  showEmployeeError('');
}

function renderEmployeeList() {
  const container = $('#employee-list');
  $('#employee-count').textContent = state.employees.length;

  if (!state.employees.length) {
    container.innerHTML = '<p class="empty">Chưa có nhân viên nào.</p>';
    return;
  }

  container.innerHTML = '';
  for (const name of state.employees) {
    const row = document.createElement('div');
    row.className = 'employee-row';
    row.innerHTML = `
      <span class="employee-row-name">
        <span class="legend-dot" style="background:${hashColor(name)}"></span>
        ${esc(name)}
      </span>
      <span class="employee-row-actions">
        <button type="button" class="btn btn-sm btn-secondary btn-edit">Sửa</button>
        <button type="button" class="btn btn-sm btn-danger">Xóa</button>
      </span>
    `;
    row.querySelector('.btn-edit').addEventListener('click', () => startEditEmployee(name));
    row.querySelector('.btn-danger').addEventListener('click', () => removeEmployeeByName(name));
    container.appendChild(row);
  }
}

function startEditEmployee(name) {
  editingEmployee = name;
  $('#employee-form-title').textContent = 'Sửa nhân viên';
  $('#employee-submit').textContent = 'Cập nhật';
  $('#employee-cancel').hidden = false;
  $('#employee-name-input').value = name;
  $('#employee-name-input').focus();
  showEmployeeError('');
}

async function submitEmployeeForm(e) {
  e.preventDefault();
  const name = $('#employee-name-input').value.trim();
  if (!name) {
    showEmployeeError('Nhập tên nhân viên.');
    return;
  }

  const btn = $('#employee-submit');
  await withLoading(btn, async () => {
    try {
      if (editingEmployee) {
        state = await api('/employees', {
          method: 'PATCH',
          body: JSON.stringify({ oldName: editingEmployee, newName: name }),
        });
        toast(`Đã cập nhật: ${editingEmployee} → ${name}`);
      } else {
        state = await api('/employees', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        toast(`Đã thêm nhân viên ${name}`);
      }
      resetEmployeeForm();
      render();
    } catch (err) {
      showEmployeeError(err.message);
    }
  });
}

async function removeEmployeeByName(name) {
  const count = state.assignments.filter((a) => a.employee === name).length;
  const extra = count ? `\n\nSẽ xóa luôn ${count} ca lịch của nhân viên này.` : '';
  if (!confirm(`Xóa nhân viên "${name}"?${extra}`)) return;

  try {
    state = await api('/employees', {
      method: 'DELETE',
      body: JSON.stringify({ name }),
    });
    if (editingEmployee === name) resetEmployeeForm();
    render();
    toast(`Đã xóa nhân viên ${name}`);
  } catch (err) {
    toast(err.message, 'error');
  }
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

function renderLegend() {
  const legend = $('#legend');
  if (!state.employees.length) {
    legend.innerHTML = '';
    return;
  }
  legend.innerHTML = state.employees
    .map(
      (name) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${hashColor(name)}"></span>${esc(name)}</span>`
    )
    .join('');
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
        <span class="legend-dot" style="background:${hashColor(a.employee)}"></span>
        <strong>${esc(a.employee)}</strong><br />
        ${esc(a.start)} – ${esc(a.end)}<br />
        ${esc(a.task)}
      </span>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.textContent = 'Xóa';
    btn.addEventListener('click', () =>
      deleteAssignment(a.id, `${a.employee} (${a.start}–${a.end}: ${a.task})`)
    );
    div.appendChild(btn);
    container.appendChild(div);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function updateNowLine() {
  if (!nowLineEl) return;
  const pct = (nowMinutes() / DAY_MINUTES) * 100;
  nowLineEl.style.left = `${pct}%`;
}

function renderTimeline() {
  const container = $('#timeline');
  nowLineEl = null;

  if (!state.employees.length) {
    container.className = 'gantt gantt--empty';
    container.innerHTML = '<p class="empty">Thêm nhân viên ở tab Quản lý để hiển thị timeline.</p>';
    return;
  }

  container.className = 'gantt';
  container.innerHTML = '';

  const board = document.createElement('div');
  board.className = 'gantt-board';

  const header = document.createElement('div');
  header.className = 'gantt-header';
  header.innerHTML = `<div class="gantt-corner">Nhân viên</div>`;

  const axis = document.createElement('div');
  axis.className = 'gantt-axis';
  for (let h = 0; h <= 24; h += 2) {
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.left = `${(h / 24) * 100}%`;
    tick.textContent = h === 24 ? '24:00' : `${h}:00`;
    axis.appendChild(tick);
  }
  header.appendChild(axis);
  board.appendChild(header);

  const body = document.createElement('div');
  body.className = 'gantt-body';

  const overlay = document.createElement('div');
  overlay.className = 'gantt-overlay';
  overlay.style.setProperty('--label-width', `${LABEL_WIDTH}px`);

  const grid = document.createElement('div');
  grid.className = 'gantt-grid';
  overlay.appendChild(grid);

  const nowLine = document.createElement('div');
  nowLine.className = 'gantt-now';
  nowLine.title = 'Giờ hiện tại';
  overlay.appendChild(nowLine);
  nowLineEl = nowLine;

  body.appendChild(overlay);

  state.employees.forEach((emp, i) => {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    if (i % 2 === 1) row.classList.add('gantt-row--alt');

    const label = document.createElement('div');
    label.className = 'gantt-label';
    label.innerHTML = `<span class="legend-dot" style="background:${hashColor(emp)}"></span><span class="gantt-name">${esc(emp)}</span>`;

    const track = document.createElement('div');
    track.className = 'gantt-track';

    const empAssignments = state.assignments.filter((a) => a.employee === emp);

    if (!empAssignments.length) {
      const idle = document.createElement('div');
      idle.className = 'gantt-idle';
      idle.textContent = 'Rảnh';
      track.appendChild(idle);
    } else {
      const withLanes = assignLanes(empAssignments);
      const maxLane = withLanes.reduce((m, a) => Math.max(m, a.lane), 0);
      const trackHeight = ROW_PADDING * 2 + (maxLane + 1) * LANE_HEIGHT + maxLane * LANE_GAP;
      track.style.height = `${Math.max(48, trackHeight)}px`;

      for (const a of withLanes) {
        const block = document.createElement('div');
        block.className = 'time-block';
        block.style.left = `${(a._start / DAY_MINUTES) * 100}%`;
        block.style.width = `${((a._end - a._start) / DAY_MINUTES) * 100}%`;
        block.style.top = `${ROW_PADDING + a.lane * (LANE_HEIGHT + LANE_GAP)}px`;
        block.style.height = `${LANE_HEIGHT}px`;
        block.style.background = hashColor(emp);
        block.dataset.tip = `${a.task} — Từ ${a.start} đến ${a.end}`;
        block.innerHTML = `<span>${esc(a.task)}</span>`;
        track.appendChild(block);
      }
    }

    row.appendChild(label);
    row.appendChild(track);
    body.appendChild(row);
  });

  board.appendChild(body);
  container.appendChild(board);
  updateNowLine();
}

function render() {
  $('#current-date').textContent = formatDateVi(state.date);
  renderEmployeeList();
  renderLegend();
  updateEmployeeSelect();
  renderAssignmentList();
  renderTimeline();
}

async function addAssignment(employee, start, end, task) {
  if (!state.employees.length) {
    showError('Thêm nhân viên ở tab Quản lý trước.');
    return;
  }
  const btn = $('#assignment-form button[type="submit"]');
  await withLoading(btn, async () => {
    try {
      state = await api('/assignments', {
        method: 'POST',
        body: JSON.stringify({ employee, start, end, task }),
      });
      showError('');
      $('#task-input').value = '';
      render();
      toast(`Đã gán lịch cho ${employee}: ${start}–${end}`);
    } catch (e) {
      showError(e.message);
    }
  });
}

async function deleteAssignment(id, label) {
  if (!confirm(`Xóa lịch này?\n\n${label}`)) return;
  try {
    state = await api(`/assignments/${id}`, { method: 'DELETE' });
    render();
    toast('Đã xóa lịch');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function bindEvents() {
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('#employee-form').addEventListener('submit', submitEmployeeForm);
  $('#employee-cancel').addEventListener('click', resetEmployeeForm);

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

async function init() {
  switchTab('employees');
  try {
    await loadState();
    render();
    setInterval(updateNowLine, 60_000);
    // ponytail: poll 15s — user khác cập nhật thì thấy luôn
    setInterval(async () => {
      try {
        const next = await api('/state');
        if (JSON.stringify(next) !== JSON.stringify(state)) {
          state = next;
          render();
        }
      } catch {
        /* bỏ qua lỗi poll */
      }
    }, 15_000);
  } catch (e) {
    $('#timeline').innerHTML =
      `<p class="error">Không tải được dữ liệu: ${esc(e.message)}. Chạy <code>npm run dev</code> và kiểm tra MONGODB_URI.</p>`;
  }
}

init();

if (import.meta.env.DEV) {
  const lanes = assignLanes([
    { start: '08:00', end: '10:00' },
    { start: '09:00', end: '11:00' },
    { start: '09:30', end: '10:30' },
  ]);
  console.assert(lanes[0].lane === 0 && lanes[1].lane === 1 && lanes[2].lane === 0, 'lane packing ok');
}
