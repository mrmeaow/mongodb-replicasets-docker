import "dotenv/config.js";

import { Db } from "mongodb";
import app from "r/app.js"; // assume app exported for testing
import { dbConnection } from "r/db.js";
import supertest from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const request = supertest(app);

const TEST_COLLECTION = "users_test";

let db: Db;

beforeAll(async () => {
  // Connect to MongoDB
  db = await dbConnection.connect();

  // Truncate test collection
  await db.collection(TEST_COLLECTION).deleteMany({});
});

afterAll(async () => {
  await dbConnection.disconnect();
});

describe("E2E: Users CRUD", () => {
  let userId: string;

  test("Create a user", async () => {
    const res = await request.post("/api/users").send({
      name: "Alice",
      email: "alice@example.com",
      age: 25,
    });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    userId = res.body.userId;
  });

  test("Get all users", async () => {
    const res = await request.get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
  });

  test("Get user by ID", async () => {
    const res = await request.get(`/api/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(userId);
  });

  test("Update user", async () => {
    const res = await request.put(`/api/users/${userId}`).send({ age: 30 });
    expect(res.status).toBe(200);
    const usr = res.body;
    // console.debug(`# DEBUG #: \n${JSON.stringify(usr, null, 2)}`);
    expect((usr as any).user.age).toBe(30);
  });

  test("Delete user", async () => {
    const res = await request.delete(`/api/users/${userId}`);
    expect(res.status).toBe(200);
  });
});

describe("E2E: Replica Set / Transactions", () => {
  // test("Test replica set status endpoint", async () => {
  //   const res = await request.get("/api/replica-status");
  //   // expect(res.status).toBe(200);
  //   console.debug(`# DEBIG # \n ${JSON.stringify(res.body, null, 2)}`);
  //   expect(res.body.setName).toBeDefined();
  //   expect(Array.isArray(res.body.members)).toBe(true);
  // });

  test("Write with transaction", async () => {
    const session = db.client.startSession();

    let insertedIds: any[] = [];

    try {
      await session.withTransaction(async () => {
        const coll = db.collection(TEST_COLLECTION);

        const r1 = await coll.insertOne({ name: "Tx1" }, { session });
        const r2 = await coll.insertOne({ name: "Tx2" }, { session });

        insertedIds.push(r1.insertedId, r2.insertedId);
      });

      // Verify inserted docs
      const docs = await db
        .collection(TEST_COLLECTION)
        .find({ _id: { $in: insertedIds } })
        .toArray();
      expect(docs.length).toBe(2);
    } finally {
      await session.endSession();
      await db
        .collection(TEST_COLLECTION)
        .deleteMany({ _id: { $in: insertedIds } });
    }
  });
});
