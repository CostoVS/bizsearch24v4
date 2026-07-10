const { initDb } = require('./lib/db/index.js');
const { users } = require('./lib/db/schema.js');

async function test() {
  console.log("Initializing database connection...");
  const db = initDb();
  if (!db) {
    console.log("No database connection active (initDb returned null).");
    return;
  }
  try {
    console.log("Querying users...");
    const allUsers = await db.select().from(users);
    console.log("Found users count:", allUsers.length);
    console.log("Users:", allUsers.map(u => ({ id: u.id, email: u.email, role: u.role, plan: u.plan })));
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

test();
