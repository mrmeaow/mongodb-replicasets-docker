import app, { IS_TEST, PORT } from "r/app.js";
import { dbConnection } from "r/db.js";

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await dbConnection.connect();

    // Start Express server
    app.listen(PORT, () => {
      if (!IS_TEST) {
        console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
        console.log(`\n📚 Available endpoints:`);
        console.log(`   GET  /health                    - Health check`);
        console.log(`   GET  /api/replica-status        - Replica set status`);
        console.log(`   GET  /api/stats                 - Database statistics`);
        console.log(`   GET  /api/users                 - Get all users`);
        console.log(`   POST /api/users                 - Create user`);
        console.log(`   GET  /api/users/:id             - Get user by ID`);
        console.log(`   PUT  /api/users/:id             - Update user`);
        console.log(`   DELETE /api/users/:id           - Delete user`);
        console.log(
          `   POST /api/test-write-concern    - Test write concern\n`,
        );
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await dbConnection.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await dbConnection.disconnect();
  process.exit(0);
});

startServer();
