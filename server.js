const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;
const JWT_SECRET = "secret123";

// ✅ MongoDB Connection
mongoose.connect("mongodb+srv://archidata2005_db_user:x04sWT6K2E3GP8H2@cluster0.kdaizoq.mongodb.net/taskdb?retryWrites=true&w=majority")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ Mongo Error:", err));


// ✅ Root Route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.send("🚀 Backend is running successfully");
});


// ✅ Models
const User = mongoose.model("User", {
  name: String,
  email: String,
  password: String
});

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


// ✅ Auth Middleware (FIXED)
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1]; // Bearer <token>

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
};


// ✅ REGISTER
app.post("/register", async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hash
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ LOGIN
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ CREATE TASK
app.post("/tasks", auth, async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      userId: req.user.id
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ GET TASKS
app.get("/tasks", auth, async (req, res) => {
  try {
    let tasks = await Task.find({ userId: req.user.id });

    tasks.sort((a, b) =>
      a.priority - b.priority ||
      new Date(a.deadline) - new Date(b.deadline)
    );

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ TOGGLE COMPLETE
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


// ✅ DELETE TASK
app.delete("/tasks/:id", auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ GRAPH FUNCTIONS
function buildGraph(tasks) {
  let graph = {};
  tasks.forEach(task => {
    graph[task._id.toString()] = task.dependencies || [];
  });
  return graph;
}

function detectCycle(graph) {
  let visited = new Set();
  let stack = new Set();

  function dfs(node) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    for (let nei of graph[node] || []) {
      if (dfs(nei)) return true;
    }

    stack.delete(node);
    return false;
  }

  return Object.keys(graph).some(node => dfs(node));
}

function topologicalSort(graph) {
  let visited = new Set();
  let result = [];

  function dfs(node) {
    if (visited.has(node)) return;
    visited.add(node);

    for (let nei of graph[node] || []) {
      dfs(nei);
    }

    result.push(node);
  }

  Object.keys(graph).forEach(node => dfs(node));

  return result.reverse();
}


// ✅ SCHEDULE
app.get("/schedule", auth, async (req, res) => {
  try {
    let tasks = await Task.find({
      userId: req.user.id,
      completed: false
    });

    let graph = buildGraph(tasks);

    if (detectCycle(graph)) {
      return res.status(400).json({
        error: "Cycle detected in dependencies!"
      });
    }

    let order = topologicalSort(graph);

    let map = {};
    tasks.forEach(t => map[t._id.toString()] = t);

    let scheduled = order.map(id => map[id]).filter(Boolean);

    scheduled.sort((a, b) => a.priority - b.priority);

    res.json(scheduled);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
