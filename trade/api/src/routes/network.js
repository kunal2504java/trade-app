import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const networkRouter = Router();
networkRouter.use(requireAuth);

/**
 * Traverses the user tree starting from a given user ID
 * and returns a flat list of all users in their downline.
 * @param {string} startUserId The ID of the user to start the search from.
 * @returns {Promise<Array<object>>} A list of user objects in the downline.
 */
async function getFullDownline(startUserId) {
  const list = [];
  const queue = [startUserId];
  const visited = new Set([startUserId]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await prisma.user.findMany({
      where: { sponsor_id: currentId },
      select: { id: true, full_name: true, sponsor_id: true, position_in_sponsor_tree: true },
    });

    for (const child of children) {
      if (!visited.has(child.id)) {
        list.push(child);
        queue.push(child.id);
        visited.add(child.id);
      }
    }
  }
  return list;
}

networkRouter.get('/genealogy', async (req, res) => {
  const userId = req.user.id;
  try {
    const nodes = await getFullDownline(userId);
    return res.json({ root: userId, nodes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load genealogy' });
  }
});

networkRouter.get('/downline', async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);
  try {
    const list = await getFullDownline(userId);
    // Sort alphabetically for consistent pagination
    list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    const items = list.slice(offset, offset + limit);
    return res.json({ items, limit, offset, total: list.length });
  } catch {
    return res.status(500).json({ error: 'Failed to load downline' });
  }
});
