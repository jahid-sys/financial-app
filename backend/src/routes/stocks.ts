import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { stocks } from '../db/schema/schema.js';
import axios from 'axios';

interface CreateStockBody {
  symbol: string;
  shares: string;
  purchasePrice: string;
  purchaseDate: string;
}

interface UpdateStockBody {
  shares?: string;
  purchasePrice?: string;
  purchaseDate?: string;
}

// Simple cache for stock prices (in-memory, expires after 5 minutes)
interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache: Map<string, PriceCache> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getStockPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number }> {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Return cached price with dummy change data
    return {
      price: cached.price,
      change: 0,
      changePercent: 0,
    };
  }

  try {
    // Using Alpha Vantage free API
    const apiKey = process.env.ALPHAVANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const price = parseFloat(data['Global Quote']['05. price']);
      const change = parseFloat(data['Global Quote']['09. change'] || '0');
      const changePercent = parseFloat(data['Global Quote']['10. change percent'] || '0');

      // Cache the price
      priceCache.set(symbol, {
        price,
        timestamp: Date.now(),
      });

      return { price, change, changePercent };
    }

    // If API fails, return mock data for demo
    return { price: 100, change: 0, changePercent: 0 };
  } catch (error) {
    // Return mock data on error
    return { price: 100, change: 0, changePercent: 0 };
  }
}

export function registerStockRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/stocks - Get all stocks for the user
  app.fastify.get('/api/stocks', {
    schema: {
      description: 'Get all stocks for the authenticated user with current prices and valuations',
      tags: ['stocks'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              symbol: { type: 'string' },
              shares: { type: 'string' },
              purchasePrice: { type: 'string' },
              purchaseDate: { type: 'string', format: 'date-time' },
              currentPrice: { type: 'number' },
              totalValue: { type: 'number' },
              gain: { type: 'number' },
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

    app.logger.info({ userId: session.user.id }, 'Fetching stocks');

    const result = await app.db
      .select()
      .from(stocks)
      .where(eq(stocks.userId, session.user.id));

    // Get current prices for all stocks
    const enrichedStocks = await Promise.all(
      result.map(async (stock) => {
        try {
          const priceData = await getStockPrice(stock.symbol);
          const shares = parseFloat(stock.shares || '0');
          const purchasePrice = parseFloat(stock.purchasePrice || '0');
          const totalCost = shares * purchasePrice;
          const totalValue = shares * priceData.price;
          const gain = totalValue - totalCost;

          return {
            id: stock.id,
            symbol: stock.symbol,
            shares: stock.shares,
            purchasePrice: stock.purchasePrice,
            purchaseDate: stock.purchaseDate,
            currentPrice: priceData.price,
            totalValue,
            gain,
          };
        } catch (error) {
          app.logger.warn({
            userId: session.user.id,
            symbol: stock.symbol,
            err: error,
          }, 'Failed to fetch current price');

          // Return with estimated/cached values
          return {
            id: stock.id,
            symbol: stock.symbol,
            shares: stock.shares,
            purchasePrice: stock.purchasePrice,
            purchaseDate: stock.purchaseDate,
            currentPrice: parseFloat(stock.purchasePrice || '0'),
            totalValue: parseFloat(stock.shares || '0') * parseFloat(stock.purchasePrice || '0'),
            gain: 0,
          };
        }
      })
    );

    app.logger.info({
      userId: session.user.id,
      count: enrichedStocks.length,
    }, 'Stocks fetched');

    return enrichedStocks;
  });

  // POST /api/stocks - Create a stock
  app.fastify.post('/api/stocks', {
    schema: {
      description: 'Create a new stock investment for the authenticated user',
      tags: ['stocks'],
      body: {
        type: 'object',
        required: ['symbol', 'shares', 'purchasePrice', 'purchaseDate'],
        properties: {
          symbol: { type: 'string' },
          shares: { type: 'string' },
          purchasePrice: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            symbol: { type: 'string' },
            shares: { type: 'string' },
            purchasePrice: { type: 'string' },
            purchaseDate: { type: 'string', format: 'date-time' },
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
    request: FastifyRequest<{ Body: CreateStockBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { symbol, shares, purchasePrice, purchaseDate } = request.body;

    app.logger.info({
      userId: session.user.id,
      symbol,
      shares,
    }, 'Creating stock');

    const result = await app.db
      .insert(stocks)
      .values({
        userId: session.user.id,
        symbol: symbol.toUpperCase(),
        shares,
        purchasePrice,
        purchaseDate: new Date(purchaseDate),
      })
      .returning();

    app.logger.info({
      userId: session.user.id,
      stockId: result[0].id,
      symbol,
    }, 'Stock created');

    reply.status(201);
    return {
      id: result[0].id,
      symbol: result[0].symbol,
      shares: result[0].shares,
      purchasePrice: result[0].purchasePrice,
      purchaseDate: result[0].purchaseDate,
      createdAt: result[0].createdAt,
    };
  });

  // PUT /api/stocks/:id - Update a stock
  app.fastify.put('/api/stocks/:id', {
    schema: {
      description: 'Update a stock investment for the authenticated user',
      tags: ['stocks'],
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
          shares: { type: 'string' },
          purchasePrice: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            symbol: { type: 'string' },
            shares: { type: 'string' },
            purchasePrice: { type: 'string' },
            purchaseDate: { type: 'string', format: 'date-time' },
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
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateStockBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;

    app.logger.info({
      userId: session.user.id,
      stockId: id,
    }, 'Updating stock');

    // Verify ownership
    const existing = await app.db
      .select()
      .from(stocks)
      .where(and(eq(stocks.id, id), eq(stocks.userId, session.user.id)));

    if (!existing.length) {
      app.logger.warn({
        userId: session.user.id,
        stockId: id,
      }, 'Stock not found or unauthorized');
      return reply.status(404).send({ error: 'Stock not found' });
    }

    const updates: any = {};
    if (request.body.shares) updates.shares = request.body.shares;
    if (request.body.purchasePrice) updates.purchasePrice = request.body.purchasePrice;
    if (request.body.purchaseDate) updates.purchaseDate = new Date(request.body.purchaseDate);

    const result = await app.db
      .update(stocks)
      .set(updates)
      .where(eq(stocks.id, id))
      .returning();

    app.logger.info({
      userId: session.user.id,
      stockId: id,
    }, 'Stock updated');

    return {
      id: result[0].id,
      symbol: result[0].symbol,
      shares: result[0].shares,
      purchasePrice: result[0].purchasePrice,
      purchaseDate: result[0].purchaseDate,
      createdAt: result[0].createdAt,
    };
  });

  // DELETE /api/stocks/:id - Delete a stock
  app.fastify.delete('/api/stocks/:id', {
    schema: {
      description: 'Delete a stock investment for the authenticated user',
      tags: ['stocks'],
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
      stockId: id,
    }, 'Deleting stock');

    // Verify ownership
    const existing = await app.db
      .select()
      .from(stocks)
      .where(and(eq(stocks.id, id), eq(stocks.userId, session.user.id)));

    if (!existing.length) {
      app.logger.warn({
        userId: session.user.id,
        stockId: id,
      }, 'Stock not found or unauthorized');
      return reply.status(404).send({ error: 'Stock not found' });
    }

    await app.db
      .delete(stocks)
      .where(eq(stocks.id, id));

    app.logger.info({
      userId: session.user.id,
      stockId: id,
    }, 'Stock deleted');

    return { success: true };
  });

  // GET /api/stocks/:symbol/price - Get current stock price
  app.fastify.get('/api/stocks/:symbol/price', {
    schema: {
      description: 'Get current price and change information for a stock symbol',
      tags: ['stocks'],
      params: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            price: { type: 'number' },
            change: { type: 'number' },
            changePercent: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { symbol: string } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { symbol } = request.params;

    if (!symbol || symbol.length === 0) {
      return reply.status(400).send({ error: 'Symbol is required' });
    }

    app.logger.info({ symbol }, 'Fetching stock price');

    try {
      const priceData = await getStockPrice(symbol.toUpperCase());

      app.logger.info({
        symbol,
        price: priceData.price,
      }, 'Stock price fetched');

      return {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
      };
    } catch (error) {
      app.logger.error({
        symbol,
        err: error,
      }, 'Failed to fetch stock price');

      return reply.status(400).send({ error: 'Failed to fetch stock price' });
    }
  });
}
