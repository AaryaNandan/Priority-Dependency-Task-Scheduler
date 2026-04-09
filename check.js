const mongoose = require('mongoose');

// PASTE YOUR ACTUAL CONNECTION STRING HERE
mongoose.connect("mongodb+srv://nandanaarya9_db_user:TlGx6YbMj02e9eRd@cluster0.xkzdtok.mongodb.net/task_scheduler");

const db = mongoose.connection;

db.once('open', async () => {
  console.log("✅ Connected to:", db.name);
  console.log("✅ Host:", db.host);
  
  // Check users collection
  const User = mongoose.model("User", { name: String, email: String });
  const users = await User.find();
  console.log("📋 Users found:", users.length);
  
  // Check tasks collection
  const Task = mongoose.model("Task", { title: String });
  const tasks = await Task.find();
  console.log("📋 Tasks found:", tasks.length);
  
  process.exit();
});

db.on('error', (err) => {
  console.log("❌ Connection error:", err);
});