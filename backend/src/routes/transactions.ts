import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sum } from 'drizzle-orm';
import { transactions } from '../db/schema/schema.js';

interface CreateTransactionBody {
  type: string;
  amount: string;
  category: string;
  description?: string;
  date: string;
}

interface UpdateTransactionBody {
  type?: string;
  amount?: string;
  category?: string;
  description?: string;
  date?: string;
}

export function registerTransactionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/transactions - Get all transactions for the user
  app.fastify.get('/api/transactions', {
    schema: {
      description: 'Get all transactions for the authenticated user',
      tags: ['transactions'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              amount: { type: 'string' },
              category: { type: 'string' },
              description: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching transactions');

    const result = await app.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, session.user.id));

    app.logger.info({ userId: session.user.id, count: result.length }, 'Transactions fetched');

    return result.map(t => ({
      ...t,
      amount: t.amount,
    }));
  });

  // POST /api/transactions - Create a transaction
  app.fastify.post('/api/transactions', {
    schema: {
      description: 'Create a new transaction for the authenticated user',
      tags: ['transactions'],
      body: {
        type: 'object',
        required: ['type', 'amount', 'category', 'date'],
        properties: {
          type: { type: 'string', enum: ['income', 'saving', 'investment'] },
          amount: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            amount: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: CreateTransactionBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { type, amount, category, description, date } = request.body;

    app.logger.info({
      userId: session.user.id,
      type,
      category,
      amount,
    }, 'Creating transaction');

    const result = await app.db
      .insert(transactions)
      .values({
        userId: session.user.id,
        type,
        amount,
        category,
        description,
        date: new Date(date),
      })
      .returning();

    app.logger.info({
      userId: session.user.id,
      transactionId: result[0].id,
    }, 'Transaction created');

    reply.status(201);
    return {
      ...result[0],
      amount: result[0].amount,
    };
  });

  // PUT /api/transactions/:id - Update a transaction
  app.fastify.put('/api/transactions/:id', {
    schema: {
      description: 'Update a transaction for the authenticated user',
      tags: ['transactions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'saving', 'investment'] },
          amount: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            amount: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTransactionBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;

    app.logger.info({
      userId: session.user.id,
      transactionId: id,
    }, 'Updating transaction');

    // Verify ownership
    const existing = await app.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));

    if (!existing.length) {
      app.logger.warn({
        userId: session.user.id,
        transactionId: id,
      }, 'Transaction not found or unauthorized');
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    const updates: any = {};
    if (request.body.type) updates.type = request.body.type;
    if (request.body.amount) updates.amount = request.body.amount;
    if (request.body.category) updates.category = request.body.category;
    if (request.body.description !== undefined) updates.description = request.body.description;
    if (request.body.date) updates.date = new Date(request.body.date);

    const result = await app.db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    app.logger.info({
      userId: session.user.id,
      transactionId: id,
    }, 'Transaction updated');

    return {
      ...result[0],
      amount: result[0].amount,
    };
  });

  // DELETE /api/transactions/:id - Delete a transaction
  app.fastify.delete('/api/transactions/:id', {
    schema: {
      description: 'Delete a transaction for the authenticated user',
      tags: ['transactions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;

    app.logger.info({
      userId: session.user.id,
      transactionId: id,
    }, 'Deleting transaction');

    // Verify ownership
    const existing = await app.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));

    if (!existing.length) {
      app.logger.warn({
        userId: session.user.id,
        transactionId: id,
      }, 'Transaction not found or unauthorized');
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    await app.db
      .delete(transactions)
      .where(eq(transactions.id, id));

    app.logger.info({
      userId: session.user.id,
      transactionId: id,
    }, 'Transaction deleted');

    return { success: true };
  });

  // GET /api/transactions/summary - Get transaction summary
  app.fastify.get('/api/transactions/summary', {
    schema: {
      description: 'Get transaction summary for the authenticated user',
      tags: ['transactions'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalIncome: { type: 'string' },
            totalSavings: { type: 'string' },
            totalInvestments: { type: 'string' },
            byCategory: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching transaction summary');

    const allTransactions = await app.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, session.user.id));

    let totalIncome = '0';
    let totalSavings = '0';
    let totalInvestments = '0';
    const byCategory: Record<string, string> = {};

    for (const t of allTransactions) {
      const amount = parseFloat(t.amount || '0');

      if (t.type === 'income') {
        totalIncome = (parseFloat(totalIncome) + amount).toString();
      } else if (t.type === 'saving') {
        totalSavings = (parseFloat(totalSavings) + amount).toString();
      } else if (t.type === 'investment') {
        totalInvestments = (parseFloat(totalInvestments) + amount).toString();
      }

      if (!byCategory[t.category]) {
        byCategory[t.category] = '0';
      }
      byCategory[t.category] = (parseFloat(byCategory[t.category]) + amount).toString();
    }

    app.logger.info({
      userId: session.user.id,
      totalIncome,
      totalSavings,
      totalInvestments,
    }, 'Transaction summary computed');

    return {
      totalIncome,
      totalSavings,
      totalInvestments,
      byCategory,
    };
  });
}
