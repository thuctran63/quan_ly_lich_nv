import {
  saveEmployees,
  addEmployee,
  renameEmployee,
  removeEmployee,
} from '../lib/store.js';
import { withHandler, parseBody } from '../lib/handler.js';

export default withHandler(async (req, res) => {
  const body = parseBody(req);

  if (req.method === 'PUT') {
    const names = body.employees;
    if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
      return res.status(400).json({ error: 'employees phải là mảng tên' });
    }
    return res.json(await saveEmployees(names));
  }

  if (req.method === 'POST') {
    return res.json(await addEmployee(body.name));
  }

  if (req.method === 'PATCH') {
    const { oldName, newName } = body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Thiếu oldName hoặc newName' });
    }
    return res.json(await renameEmployee(oldName, newName));
  }

  if (req.method === 'DELETE') {
    const name = body.name || req.query?.name;
    if (!name) return res.status(400).json({ error: 'Thiếu tên nhân viên' });
    return res.json(await removeEmployee(name));
  }

  res.status(405).json({ error: 'Method not allowed' });
});
