import { saveEmployees } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const names = req.body?.employees;
  if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
    return res.status(400).json({ error: 'employees phải là mảng tên' });
  }

  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!cleaned.length) {
    return res.status(400).json({ error: 'Cần ít nhất một nhân viên' });
  }

  res.json(await saveEmployees(cleaned));
}
