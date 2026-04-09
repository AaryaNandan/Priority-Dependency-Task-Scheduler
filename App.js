import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ id: '', description: '', priority: 3, deadline: '', dependencies: '' });

  const fetchTasks = async () => {
    const res = await axios.get('http://localhost:5000/tasks');
    setTasks(res.data);
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = async () => {
    await axios.post('http://localhost:5000/tasks', {
      ...form,
      dependencies: form.dependencies.split(',').map(d => d.trim())
    });
    fetchTasks();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Task Scheduler</h1>
      <input placeholder="ID" onChange={e => setForm({...form, id: e.target.value})} />
      <input placeholder="Description" onChange={e => setForm({...form, description: e.target.value})} />
      <input type="number" placeholder="Priority" onChange={e => setForm({...form, priority: e.target.value})} />
      <input type="date" onChange={e => setForm({...form, deadline: e.target.value})} />
      <input placeholder="Dependencies" onChange={e => setForm({...form, dependencies: e.target.value})} />
      <button onClick={addTask}>Add Task</button>

      <ul>
        {tasks.map(t => (
          <li key={t.id}>{t.description} (Priority: {t.priority})</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
