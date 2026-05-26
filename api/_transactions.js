const fs = require("node:fs/promises");
const path = require("node:path");

const storePath = process.env.VERCEL
  ? path.join("/tmp", "dmrc-cashfree-transactions.json")
  : path.join(process.cwd(), "data", "cashfree-transactions.json");

let memoryStore = {
  transactions: [],
  wallet: {
    balance: 0,
    creditedOrders: []
  },
  webhooks: []
};

async function readStore() {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return memoryStore;
  }
}

async function writeStore(store) {
  memoryStore = store;

  try {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Serverless storage can be ephemeral. Keep the in-memory copy for the current function instance.
  }
}

async function upsertTransaction(transaction) {
  const store = await readStore();
  const existingIndex = store.transactions.findIndex((item) => item.orderId === transaction.orderId);
  const nextTransaction = {
    ...transaction,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    store.transactions[existingIndex] = {
      ...store.transactions[existingIndex],
      ...nextTransaction
    };
  } else {
    store.transactions.unshift({
      createdAt: new Date().toISOString(),
      ...nextTransaction
    });
  }

  await writeStore(store);
  return store.transactions.find((item) => item.orderId === transaction.orderId);
}

async function getTransaction(orderId) {
  const store = await readStore();
  return store.transactions.find((item) => item.orderId === orderId) || null;
}

async function markTransaction(orderId, status, payload) {
  const store = await readStore();
  let transaction = store.transactions.find((item) => item.orderId === orderId);

  if (!transaction) {
    transaction = {
      orderId,
      amount: Number(payload?.order?.order_amount || payload?.payment?.payment_amount || payload?.order_amount || 0),
      status: "PENDING",
      createdAt: new Date().toISOString()
    };
    store.transactions.unshift(transaction);
  }

  transaction.status = status;
  transaction.updatedAt = new Date().toISOString();
  transaction.latestWebhook = payload;
  await writeStore(store);
  return transaction;
}

async function creditWalletOnce(orderId, amount) {
  const store = await readStore();

  if (store.wallet.creditedOrders.includes(orderId)) {
    return {
      credited: false,
      balance: store.wallet.balance
    };
  }

  store.wallet.balance += Number(amount || 0);
  store.wallet.creditedOrders.push(orderId);
  await writeStore(store);

  return {
    credited: true,
    balance: store.wallet.balance
  };
}

async function appendWebhook(payload) {
  const store = await readStore();
  store.webhooks.unshift({
    receivedAt: new Date().toISOString(),
    payload
  });

  if (store.webhooks.length > 100) {
    store.webhooks.length = 100;
  }

  await writeStore(store);
}

module.exports = {
  appendWebhook,
  creditWalletOnce,
  getTransaction,
  markTransaction,
  upsertTransaction
};
