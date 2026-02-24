import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { conversations, messages } from '../db/schema/schema.js';
import { gateway } from '@specific-dev/framework';
import { streamText } from 'ai';

interface CreateConversationBody {
  title?: string;
}

interface ChatStreamBody {
  conversationId: string;
  message: string;
}

export function registerConversationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/conversations - Create a new conversation
  app.fastify.post('/api/conversations', {
    schema: {
      description: 'Create a new conversation for the authenticated user',
      tags: ['conversations'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
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
    request: FastifyRequest<{ Body: CreateConversationBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { title } = request.body;

    app.logger.info({
      userId: session.user.id,
      title,
    }, 'Creating conversation');

    const result = await app.db
      .insert(conversations)
      .values({
        userId: session.user.id,
        title,
      })
      .returning();

    app.logger.info({
      userId: session.user.id,
      conversationId: result[0].id,
    }, 'Conversation created');

    reply.status(201);
    return {
      conversationId: result[0].id,
      title: result[0].title,
      createdAt: result[0].createdAt,
    };
  });

  // GET /api/conversations - List all conversations for the user
  app.fastify.get('/api/conversations', {
    schema: {
      description: 'List all conversations for the authenticated user',
      tags: ['conversations'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conversationId: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
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

    app.logger.info({ userId: session.user.id }, 'Fetching conversations');

    const result = await app.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, session.user.id));

    app.logger.info({
      userId: session.user.id,
      count: result.length,
    }, 'Conversations fetched');

    return result.map(c => ({
      conversationId: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  });

  // GET /api/conversations/:id/messages - Get messages for a conversation
  app.fastify.get('/api/conversations/:id/messages', {
    schema: {
      description: 'Get all messages for a conversation',
      tags: ['conversations'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              role: { type: 'string' },
              content: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
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
  ): Promise<any[] | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;

    app.logger.info({
      userId: session.user.id,
      conversationId: id,
    }, 'Fetching conversation messages');

    // Verify conversation ownership
    const conv = await app.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)));

    if (!conv.length) {
      app.logger.warn({
        userId: session.user.id,
        conversationId: id,
      }, 'Conversation not found or unauthorized');
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    const result = await app.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id));

    app.logger.info({
      userId: session.user.id,
      conversationId: id,
      messageCount: result.length,
    }, 'Conversation messages fetched');

    return result.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  });

  // WebSocket /api/chat/stream - Streaming chat with AI
  app.fastify.route({
    method: 'GET',
    url: '/api/chat/stream',
    schema: {
      description: 'WebSocket endpoint for AI financial advisor chat. Send first message as bearer token for authentication, then send JSON: { conversationId, message }',
      tags: ['websocket'],
    },
    wsHandler: (socket, request) => {
      let session: { user: { id: string; email: string } } | null = null;

      socket.on('message', async (raw) => {
        const data = raw.toString();

        // First message must be the bearer token
        if (!session) {
          session = await app.authenticateWsToken(data);
          if (!session) {
            socket.send(JSON.stringify({ error: 'Unauthorized' }));
            socket.close();
            return;
          }
          socket.send(JSON.stringify({ type: 'authenticated', userId: session.user.id }));
          return;
        }

        // Subsequent messages - parse JSON and process
        try {
          const payload = JSON.parse(data) as ChatStreamBody;
          const { conversationId, message: userMessage } = payload;

          app.logger.info({
            userId: session.user.id,
            conversationId,
          }, 'Chat message received');

          // Verify conversation ownership
          const conv = await app.db
            .select()
            .from(conversations)
            .where(and(
              eq(conversations.id, conversationId),
              eq(conversations.userId, session.user.id)
            ));

          if (!conv.length) {
            socket.send(JSON.stringify({ error: 'Conversation not found' }));
            return;
          }

          // Save user message
          const userMsg = await app.db
            .insert(messages)
            .values({
              conversationId,
              role: 'user',
              content: userMessage,
            })
            .returning();

          app.logger.info({
            userId: session.user.id,
            conversationId,
            messageId: userMsg[0].id,
          }, 'User message saved');

          // Get conversation history
          const history = await app.db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversationId));

          // Prepare messages for AI
          const aiMessages = history.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          // Stream AI response
          const result = streamText({
            model: gateway('google/gemini-2.5-flash'),
            system: 'You are an expert financial advisor. Provide helpful, practical advice about investments, savings, budgeting, and personal finance. Be concise and actionable.',
            messages: aiMessages,
          });

          let fullResponse = '';

          socket.send(JSON.stringify({
            type: 'stream_start',
            conversationId,
          }));

          // Stream chunks to client
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            socket.send(JSON.stringify({
              type: 'stream_chunk',
              content: chunk,
            }));
          }

          // Save assistant message
          const assistantMsg = await app.db
            .insert(messages)
            .values({
              conversationId,
              role: 'assistant',
              content: fullResponse,
            })
            .returning();

          app.logger.info({
            userId: session.user.id,
            conversationId,
            messageId: assistantMsg[0].id,
          }, 'Assistant message saved');

          socket.send(JSON.stringify({
            type: 'stream_end',
            conversationId,
          }));
        } catch (error) {
          app.logger.error({ err: error }, 'Error processing chat message');
          socket.send(JSON.stringify({
            error: 'Failed to process message',
          }));
        }
      });

      socket.on('close', () => {
        app.logger.info({
          userId: session?.user.id,
        }, 'WebSocket client disconnected');
      });
    },
    handler: async (request, reply) => {
      return { protocol: 'ws', path: '/api/chat/stream' };
    },
  });
}
