import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const walletRouter = Router();
walletRouter.use(requireAuth);

const depositRequestSchema = z.object({
  amount: z.number().positive('Amount must be a positive number.'),
  // You could add other fields here like a transaction ID from a payment processor
});

walletRouter.post('/deposit-request', async (req, res) => {
  const userId = req.user.id;
  const parse = depositRequestSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { amount } = parse.data;

  try {
    // Create a PENDING transaction. This does NOT update the wallet balance yet.
    const depositRequest = await prisma.transaction.create({
      data: {
        user_id: userId,
        amount,
        type: 'credit',
        income_source: 'manual_deposit',
        status: 'PENDING', // The transaction starts as pending
        description: `User deposit request of $${amount}.`,
      },
    });
    res.status(201).json({ message: 'Deposit request submitted successfully. It will be reviewed by an admin.', request: depositRequest });
  } catch (error) {
    console.error('Deposit request failed:', error);
    res.status(500).json({ error: 'Failed to submit deposit request.' });
  }
});

walletRouter.get('/balance', async (req, res) => {
  const userId = req.user.id;
  try {
    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
    return res.json({ balance: wallet?.balance ?? 0 });
  } catch {
    return res.status(500).json({ error: 'Failed to load balance' });
  }
});

walletRouter.get('/transactions', async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);
  try {
    const items = await prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    });
    const total = await prisma.transaction.count({ where: { user_id: userId } });
    return res.json({ items, limit, offset, total });
  } catch {
    return res.status(500).json({ error: 'Failed to load transactions' });
  }
});

const withdrawSchema = z.object({ amount: z.number().positive() });

walletRouter.post('/withdraw', async (req, res) => {
  const userId = req.user.id;
  const parse = withdrawSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { amount } = parse.data;

  try {
    if (amount < 100) return res.status(400).json({ error: 'Minimum withdrawal is $100.' });

    const createdTransaction = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      await tx.wallet.update({
        where: { user_id: userId },
        data: { balance: { decrement: amount } },
      });

      return tx.transaction.create({
        data: {
          user_id: userId, amount, type: 'debit', income_source: 'withdrawal',
          description: 'User withdrawal request',
          status: 'COMPLETED'
        },
      });
    });

    return res.status(201).json(createdTransaction);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Withdraw failed';
    return res.status(400).json({ error: message });
  }
});