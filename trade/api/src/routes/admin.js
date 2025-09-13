import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const adminRouter = Router();

// Protect all routes in this file so only logged-in admins can access them
adminRouter.use(requireAuth, requireAdmin);

/**
 * Route to get all transactions with a 'PENDING' status.
 * This is for the admin's "Manage Deposits" page.
 */
adminRouter.get('/deposits/pending', async (req, res) => {
  try {
    const pendingRequests = await prisma.transaction.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    res.json(pendingRequests);
  } catch (error) {
    console.error('Failed to fetch pending deposits:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
});

/**
 * Route to approve a pending deposit.
 * It updates the transaction status and increments the user's wallet balance.
 */
adminRouter.post('/deposits/approve/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });

    if (!transaction || transaction.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending transaction not found.' });
    }

    // Use a database transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Update the user's wallet
      await tx.wallet.update({
        where: { user_id: transaction.user_id },
        data: { balance: { increment: transaction.amount } },
      });

      // 2. Mark the transaction as COMPLETED
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      });
    });

    res.status(200).json({ message: 'Deposit approved successfully.' });
  } catch (error) {
    console.error('Failed to approve deposit:', error);
    res.status(500).json({ error: 'Failed to approve deposit.' });
  }
});

/**
 * Route to decline a pending deposit.
 * It updates the transaction status to 'FAILED'.
 */
adminRouter.post('/deposits/decline/:transactionId', async (req, res) => {
    const { transactionId } = req.params;
    try {
        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId, status: 'PENDING' },
            data: { status: 'FAILED' },
        });

        if (!updatedTransaction) {
            return res.status(404).json({ error: 'Pending transaction not found.' });
        }

        res.status(200).json({ message: 'Deposit declined successfully.' });
    } catch (error) {
        console.error('Failed to decline deposit:', error);
        res.status(500).json({ error: 'Failed to decline deposit.' });
    }
});

