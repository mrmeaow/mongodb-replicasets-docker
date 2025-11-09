import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { dbConnection } from "r/db.js";

dotenv.config();

const app = express();
export const PORT = process.env.PORT || 3003;
export const IS_TEST = ["test", "testing"].includes(
  String(process.env.NODE_ENV).toLowerCase(),
);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    await db.admin().ping();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: db.databaseName,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get replica set status
// app.get("/api/replica-status", async (_req: Request, res: Response) => {
//   try {
//     const client = dbConnection.getClient();
//     const admin = client.db("admin");
//     const status = await admin.command({ replSetGetStatus: 1 });

//     const members = status.members.map((member: any) => ({
//       name: member.name,
//       state: member.stateStr,
//       health: member.health,
//       uptime: member.uptime,
//       isPrimary: member.stateStr === "PRIMARY",
//       isSecondary: member.stateStr === "SECONDARY",
//     }));

//     res.json({
//       setName: status.set,
//       date: status.date,
//       members,
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// CRUD Operations for a sample "users" collection

// Create a user
app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const users = db.collection("users");

    const { name, email, age } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const user = {
      name,
      email,
      age: age || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(user);

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertedId,
      user: { ...user, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all users
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const users = db.collection("users");

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [usersList, total] = await Promise.all([
      users.find().skip(skip).limit(limit).toArray(),
      users.countDocuments(),
    ]);

    res.json({
      users: usersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get user by ID
app.get("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const users = db.collection("users");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await users.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update user
app.put("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const users = db.collection("users");

    const { id } = req.params;
    const { name, email, age } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (age !== undefined) updateData.age = age;

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user: result,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete user
app.delete("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const users = db.collection("users");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await users.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test write concern (replica set feature)
app.post("/api/test-write-concern", async (req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const testCollection = db.collection("write_concern_test");

    const { data, writeConcern = "majority" } = req.body;

    const startTime = Date.now();

    const result = await testCollection.insertOne(
      { data, timestamp: new Date() },
      { writeConcern: { w: writeConcern } },
    );

    const endTime = Date.now();

    res.json({
      message: "Write successful",
      writeConcern,
      duration: `${endTime - startTime}ms`,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Database stats
app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const db = dbConnection.getDb();
    const stats = await db.stats();

    res.json({
      database: stats.db,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

export default app;
