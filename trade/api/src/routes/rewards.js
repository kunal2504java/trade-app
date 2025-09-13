import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const rewardsRouter = Router();
rewardsRouter.use(requireAuth);

rewardsRouter.get('/status', async (req, res) => {
  const userId = req.user.id;
  try {
    const [rewards, user, userRewards] = await Promise.all([
      prisma.reward.findMany(),
      prisma.user.findUnique({
        where: { id: userId },
        select: { registrationDate: true }
      }),
      prisma.userReward.findMany({
        where: { user_id: userId }
      }),
    ]);

    const regDate = user?.registrationDate || new Date();

    const statuses = rewards.map((r) => {
      const ur = userRewards.find((ur) => ur.reward_id === r.id);
      const deadline = new Date(regDate);
      deadline.setDate(deadline.getDate() + r.timeframeInDays);
      const remainingMs = Math.max(0, deadline.getTime() - new Date().getTime());
      
      return {
        rewardId: r.id,
        rewardName: r.rewardName,
        bonusAmount: r.bonusAmount,
        timeframeInDays: r.timeframeInDays,
        status: ur?.status ?? 'in_progress',
        deadlineDate: deadline,
        remainingMs,
      };
    });
    return res.json(statuses);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load rewards status' });
  }
});
