import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let transactionId: string;
  let conversationId: string;
  let stockId: string;

  // Authentication - must be first
  test("Sign up test user", async () => {
    const { token } = await signUpTestUser();
    authToken = token;
    expect(authToken).toBeDefined();
  });

  // Transactions
  test("Create transaction", async () => {
    const res = await authenticatedApi("/api/transactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "income",
        amount: "1000.00",
        category: "Salary",
        date: new Date().toISOString(),
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    transactionId = data.id;
  });

  test("Get all transactions", async () => {
    const res = await authenticatedApi("/api/transactions", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Update transaction", async () => {
    const res = await authenticatedApi(`/api/transactions/${transactionId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: "1500.00",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Delete transaction", async () => {
    const res = await authenticatedApi(`/api/transactions/${transactionId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Create transaction with missing required fields returns 400", async () => {
    const res = await authenticatedApi("/api/transactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "income",
        amount: "1000.00",
        // missing category and date
      }),
    });
    await expectStatus(res, 400);
  });

  test("Update non-existent transaction returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authenticatedApi(`/api/transactions/${fakeId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: "1500.00",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Delete non-existent transaction returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authenticatedApi(`/api/transactions/${fakeId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Get transaction summary", async () => {
    const res = await authenticatedApi("/api/transactions/summary", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.totalIncome).toBeDefined();
    expect(data.totalSavings).toBeDefined();
    expect(data.totalInvestments).toBeDefined();
  });

  // Conversations
  test("Create conversation", async () => {
    const res = await authenticatedApi("/api/conversations", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Financial Planning",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.conversationId).toBeDefined();
    conversationId = data.conversationId;
  });

  test("Get all conversations", async () => {
    const res = await authenticatedApi("/api/conversations", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get messages for conversation", async () => {
    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get messages for non-existent conversation returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authenticatedApi(`/api/conversations/${fakeId}/messages`, authToken);
    await expectStatus(res, 404);
  });

  // Stocks
  test("Create stock investment", async () => {
    const res = await authenticatedApi("/api/stocks", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        shares: "10",
        purchasePrice: "150.00",
        purchaseDate: new Date().toISOString(),
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    stockId = data.id;
  });

  test("Get all stocks", async () => {
    const res = await authenticatedApi("/api/stocks", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get stock price", async () => {
    const res = await authenticatedApi("/api/stocks/AAPL/price", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.symbol).toBe("AAPL");
    expect(data.price).toBeDefined();
  });

  test("Update stock investment", async () => {
    const res = await authenticatedApi(`/api/stocks/${stockId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shares: "15",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Delete stock investment", async () => {
    const res = await authenticatedApi(`/api/stocks/${stockId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Delete non-existent stock returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authenticatedApi(`/api/stocks/${fakeId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Update non-existent stock returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authenticatedApi(`/api/stocks/${fakeId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shares: "20",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Create stock with missing required fields returns 400", async () => {
    const res = await authenticatedApi("/api/stocks", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        // missing shares, purchasePrice, purchaseDate
      }),
    });
    await expectStatus(res, 400);
  });

  // WebSocket
  test("Connect to chat stream with authentication", async () => {
    const ws = await connectAuthenticatedWebSocket("/api/chat/stream", authToken);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  // Unauthenticated access
  test("Unauthenticated GET /api/transactions returns 401", async () => {
    const res = await api("/api/transactions");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/transactions returns 401", async () => {
    const res = await api("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "income",
        amount: "1000.00",
        category: "Salary",
        date: new Date().toISOString(),
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/stocks returns 401", async () => {
    const res = await api("/api/stocks");
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/conversations returns 401", async () => {
    const res = await api("/api/conversations");
    await expectStatus(res, 401);
  });
});
