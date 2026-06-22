import { readState } from '../lib/store.js';
import { withHandler } from '../lib/handler.js';

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.json(await readState());
});
