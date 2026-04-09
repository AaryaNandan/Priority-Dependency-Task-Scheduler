const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// 🔴 REPLACE WITH YOUR ACTUAL MONGODB CONNECTION STRING 🔴
mongoose.connect("mongodb+srv://nandanaarya9_db_user:TlGx6YbMj02e9eRd@cluster0.xkzdtok.mongodb.net/task_scheduler");

// User Model
const User = mongoose.model("User", {
  name: String,
  email: String,
  password: String
});

// Task Model
const Task = mongoose.model("Task", {
  userId: String,
  title: String,
  description: String,
  priority: Number,
  deadline: Date,
  dependencies: [String],
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, "secret123");
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
};

// ✅ REGISTER (WITH DEBUG LOGS)
app.post("/register", async (req, res) => {
  try {
    console.log("📝 Register attempt:", req.body);
    
    const existing = await User.findOne({ email: req.body.email });
    console.log("Existing user check:", existing);
    
    if (existing) return res.status(400).json({ error: "Email already exists" });
    
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ 
      name: req.body.name, 
      email: req.body.email, 
      password: hash 
    });
    
    console.log("✅ User created:", user);
    
    const token = jwt.sign({ id: user._id }, "secret123");
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.log("❌ Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    console.log("🔐 Login attempt:", req.body.email);
    
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, "secret123");
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Task
app.post("/tasks", auth, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, userId: req.user.id });
    console.log("📌 Task created:", task.title);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Tasks (Priority Queue + Topological Sort)
app.get("/tasks", auth, async (req, res) => {
  try {
    let tasks = await Task.find({ userId: req.user.id });
    tasks.sort((a, b) => a.priority - b.priority || new Date(a.deadline) - new Date(b.deadline));
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Complete
app.put("/tasks/:id/toggle", auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    task.completed = !task.completed;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task
app.delete("/tasks/:id", auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graph + Cycle Detection + Topological Sort
function buildGraph(tasks) {
  let graph = {};
  tasks.forEach(task => {
    graph[task._id.toString()] = task.dependencies || [];
  });
  return graph;
}

function detectCycle(graph) {
  let visited = new Set();
  let recursionStack = new Set();

  function dfs(node) {
    if (recursionStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    recursionStack.add(node);

    for (let neighbor of graph[node] || []) {
      if (dfs(neighbor)) return true;
    }

    recursionStack.delete(node);
    return false;
  }

  for (let node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }
  return false;
}

function topologicalSort(graph) {
  let visited = new Set();
  let result = [];

  function dfs(node) {
    if (visited.has(node)) return;
    visited.add(node);
    for (let neighbor of graph[node] || []) {
      dfs(neighbor);
    }
    result.push(node);
  }

  for (let node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  return result.reverse();
}

// Schedule Endpoint with DSA
app.get("/schedule", auth, async (req, res) => {
  try {
    let tasks = await Task.find({ userId: req.user.id, completed: false });
    let graph = buildGraph(tasks);

    if (detectCycle(graph)) {
      return res.status(400).json({ error: "Cycle detected in dependencies!" });
    }

    let order = topologicalSort(graph);
    let taskMap = {};
    tasks.forEach(task => taskMap[task._id.toString()] = task);

    let scheduled = order.map(id => taskMap[id]).filter(t => t);
    
    scheduled.sort((a, b) => a.priority - b.priority);
    res.json(scheduled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));