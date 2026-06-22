import express from 'express';
import { randomUUID } from 'crypto';
import {
  readState,
  saveEmployees,
  addAssignment,
  deleteAssignment,
} from './lib/store.js';

const app = express();
app.use(express.json());

app.get('/api/state', async (_req, res) => res.json(await readState()));

app.put('/api/employees', async (req, res) => {
  const names = req.body?.employees;
  if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
    return res.status(400).json({ error: 'employees phải là mảng tên' });
  }
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!cleaned.length) return res.status(400).json({ error: 'Cần ít nhất một nhân viên' });
  res.json(await saveEmployees(cleaned));
});

app.post('/api/assignments', async (req, res) => {
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
});

app.delete('/api/assignments/:id', async (req, res) => {
  res.json(await deleteAssignment(req.params.id));
});

app.listen(3001, () => console.log('API dev http://localhost:3001'));
