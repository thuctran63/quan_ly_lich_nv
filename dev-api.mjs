import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { readState, saveEmployees, addAssignment, deleteAssignment } from './lib/store.js';
import { ApiError } from './lib/handler.js';

const app = express();
app.use(express.json());

function send(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      const status = e instanceof ApiError ? e.status : 500;
      res.status(status).json({ error: e.message || 'Lỗi server' });
    }
  };
}

app.get('/api/state', send(async (_req, res) => res.json(await readState())));

app.put('/api/employees', send(async (req, res) => {
  const names = req.body?.employees;
  if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
    return res.status(400).json({ error: 'employees phải là mảng tên' });
  }
  res.json(await saveEmployees(names));
}));

app.post('/api/assignments', send(async (req, res) => {
  const { employee, start, end, task } = req.body ?? {};
  if (!employee || !start || !end || !task?.trim()) {
    return res.status(400).json({ error: 'Thiếu thông tin lịch' });
  }
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu' });
  }
  res.json(
    await addAssignment({
      id: randomUUID(),
      employee,
      start,
      end,
      task: task.trim(),
    })
  );
}));

app.delete('/api/assignments/:id', send(async (req, res) => {
  res.json(await deleteAssignment(req.params.id));
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API dev http://localhost:${PORT}`));
