import { saveEmployees } from '../lib/store.js';
import { withHandler, parseBody } from '../lib/handler.js';

export default withHandler(async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const names = body.employees;
  if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
    return res.status(400).json({ error: 'employees phải là mảng tên' });
  }

  res.json(await saveEmployees(names));
});
