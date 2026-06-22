import { deleteAssignment } from '../../lib/store.js';
import { withHandler } from '../../lib/handler.js';

export default withHandler(async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Thiếu id' });

  res.json(await deleteAssignment(id));
});
