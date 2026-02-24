import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { registerTransactionRoutes } from './routes/transactions.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerStockRoutes } from './routes/stocks.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Register routes
registerTransactionRoutes(app);
registerConversationRoutes(app);
registerStockRoutes(app);

await app.run();
app.logger.info('Application running');
