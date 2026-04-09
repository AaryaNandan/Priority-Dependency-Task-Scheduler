const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];

app.post('/tasks', (req, res) => {
    tasks.push(req.body);
    res.json({ message: 'Task added' });
});

app.get('/tasks', (req, res) => {
    res.json(tasks);
});

app.delete('/tasks/:id', (req, res) => {
    tasks = tasks.filter(t => t.id !== req.params.id);
    res.json({ message: 'Task deleted' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
