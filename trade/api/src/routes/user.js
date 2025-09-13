import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const userRouter = Router();
userRouter.use(requireAuth);

/**
 * Recursively fetches all user IDs in a downline starting from a given set of users.
 * @param {string[]} startUserIds - An array of user IDs to start the traversal from.
 * @returns {Promise<string[]>} A flat array of all unique user IDs in the downline.
 */
async function getDownlineIds(startUserIds) {
    if (startUserIds.length === 0) return [];
    const allDescendants = new Set();
    let queue = [...startUserIds];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        allDescendants.add(currentId);
        
        const children = await prisma.user.findMany({
            where: { sponsor_id: currentId },
            select: { id: true },
        });
        queue.push(...children.map(c => c.id));
    }
    return Array.from(allDescendants);
}

userRouter.get('/dashboard', async (req, res) => {
    const userId = req.user.id;
    try {
        const investmentAgg = await prisma.investment.aggregate({
            _sum: { amount: true }, where: { user_id: userId },
        });
        const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
        const recentTransactions = await prisma.transaction.findMany({
            where: { 
                user_id: userId,
                status: { not: 'PENDING' } 
            }, 
            orderBy: { timestamp: 'desc' }, 
            take: 10,
        });

        const downline = await getDownlineIds([userId]);

        return res.json({
            total_investment: investmentAgg._sum.amount ?? 0,
            wallet_balance: wallet?.balance ?? 0,
            recent_transactions: recentTransactions,
            // Subtract 1 to not include the user themselves in the count
            network_size: downline.length - 1,
        });
    } catch(err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

userRouter.get('/profile', async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { full_name: true, email: true, referral_code: true, sponsor_id: true, position_in_sponsor_tree: true, created_at: true },
        });
        return res.json(user);
    } catch {
        return res.status(500).json({ error: 'Failed to load profile' });
    }
});

userRouter.get('/profit-history', async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await prisma.$queryRaw`
            SELECT to_char(timestamp, 'YYYY-MM') as month, SUM(amount) as profit
            FROM "Transaction"
            WHERE user_id = ${userId} AND type = 'credit'
            GROUP BY month
            ORDER BY month ASC;
        `;
        // Convert BigInt profit values to numbers for JSON compatibility
        const formattedResult = result.map(r => ({ ...r, profit: Number(r.profit) }));
        return res.json(formattedResult);
    } catch(e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed to load history' });
    }
});

userRouter.get('/income-breakdown', async (req, res) => {
    const userId = req.user.id;
    try {
        const agg = await prisma.transaction.groupBy({
            by: ['income_source'],
            _sum: { amount: true },
            where: { user_id: userId, type: 'credit', status: { not: 'PENDING' } },
        });
        
        const result = agg.map(a => ({
            source: a.income_source,
            amount: a._sum.amount ?? 0,
        }));
        return res.json(result);
    } catch(e) {
        return res.status(500).json({ error: 'Failed to load income breakdown' });
    }
});

userRouter.get('/salary-status', async (req, res) => {
    const userId = req.user.id;
    try {
        const leftChildren = await prisma.user.findMany({ where: { sponsor_id: userId, position_in_sponsor_tree: 'L' }, select: { id: true } });
        const rightChildren = await prisma.user.findMany({ where: { sponsor_id: userId, position_in_sponsor_tree: 'R' }, select: { id: true } });

        const leftIds = await getDownlineIds(leftChildren.map(c => c.id));
        const rightIds = await getDownlineIds(rightChildren.map(c => c.id));
        
        const leftVolAgg = await prisma.investment.aggregate({ _sum: { amount: true }, where: { user_id: { in: leftIds } } });
        const rightVolAgg = await prisma.investment.aggregate({ _sum: { amount: true }, where: { user_id: { in: rightIds } } });

        const leftVolume = leftVolAgg._sum.amount ?? 0;
        const rightVolume = rightVolAgg._sum.amount ?? 0;
        
        const ranks = [
            { name: 'Rank 1', left: 10000, right: 10000, salary: 100 },
            { name: 'Rank 2', left: 50000, right: 50000, salary: 600 },
            { name: 'Rank 3', left: 100000, right: 100000, salary: 1500 },
        ];
        const progress = ranks.map(r => ({
            rankName: r.name,
            leftTarget: r.left, rightTarget: r.right, salary: r.salary,
            isAchieved: leftVolume >= r.left && rightVolume >= r.right,
            leftProgress: Math.min(1, leftVolume / r.left),
            rightProgress: Math.min(1, rightVolume / r.right),
        }));
        const current = progress.slice().reverse().find(p => p.isAchieved) ?? null;
        
        return res.json({ leftVolume, rightVolume, ranks: progress, currentRank: current?.rankName ?? null });
    } catch(e) {
        return res.status(500).json({ error: 'Failed to load salary status' });
    }
});
