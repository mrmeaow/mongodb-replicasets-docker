import { Db, MongoClient } from "mongodb";

class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionString: string;

  constructor() {
    const replicaSet = process.env.MONGO_REPLICA_SET || "rs0";
    const host = process.env.MONGO_HOST || "localhost";
    const ports = process.env.MONGO_PORTS || "27017,27018,27019";
    const user = process.env.MONGO_USER || "app_user";
    const password = process.env.MONGO_PASSWORD || "strongpassword";
    const HOSTS = () => {
      return ports
        .split(",")
        .map((port) => `${host}:${port}`)
        .join(",");
    };

    // Connection string for replica set
    this.connectionString = `mongodb://${user}:${password}@${HOSTS()}/?replicaSet=${replicaSet}&authSource=admin`;
  }

  async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    try {
      console.log("🔌 Connecting to MongoDB Replica Set...");

      this.client = new MongoClient(this.connectionString, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      console.log("🔍 Selecting MongoDB server...");
      console.debug("🔍 Connection String:", this.connectionString);

      await this.client.connect();

      // Test the connection
      await this.client.db("admin").command({ ping: 1 });

      this.db = this.client.db(process.env.MONGO_DATABASE || "testdb");

      console.log("✅ Connected to MongoDB Replica Set");
      console.log(`📊 Database: ${this.db.databaseName}`);

      // Log replica set status
      //   await this.logReplicaSetStatus();

      return this.db;
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async logReplicaSetStatus(): Promise<void> {
    try {
      if (!this.client) return;

      const admin = this.client.db("admin");
      const status = await admin.command({ replSetGetStatus: 1 });

      console.log("\n📊 Replica Set Status:");
      console.log(`   Set Name: ${status.set}`);
      console.log(`   Members:`);

      status.members.forEach((member: any) => {
        const isPrimary = member.stateStr === "PRIMARY" ? "👑" : "  ";
        console.log(
          `   ${isPrimary} ${member.name} - ${member.stateStr} (health: ${member.health})`,
        );
      });
      console.log("");
    } catch (error) {
      console.warn("⚠️  Could not fetch replica set status", error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("🔌 Disconnected from MongoDB");
      this.client = null;
      this.db = null;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.client;
  }
}

export const dbConnection = new DatabaseConnection();
