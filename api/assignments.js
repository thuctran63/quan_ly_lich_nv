import { randomUUID } from 'crypto';
import { addAssignment } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
