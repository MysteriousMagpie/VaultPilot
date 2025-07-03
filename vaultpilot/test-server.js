/**
 * Simple test server for the Plan My Day feature
 * Run with: node test-server.js
 */

const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Plan My Day endpoint
app.post('/planday', (req, res) => {
  console.log('Received plan day request');
  console.log('Note content length:', req.body.note ? req.body.note.length : 0);
  
  // Mock response based on current time
  const now = new Date();
  const currentHour = now.getHours();
  
  // Generate a simple schedule based on time of day
  let scheduleMarkdown = '';
  let headline = '';
  
  if (currentHour < 12) {
    // Morning schedule
    scheduleMarkdown = `| Time | Task |
|------|------|
| 9:00 AM | Morning standup |
| 10:00 AM | Deep work session |
| 11:30 AM | Email and communications |
| 12:00 PM | Lunch break |`;
    headline = 'Good morning! Your day is planned ☀️';
  } else if (currentHour < 17) {
    // Afternoon schedule
    scheduleMarkdown = `| Time | Task |
|------|------|
| 1:00 PM | Project review |
| 2:30 PM | Team meeting |
| 3:30 PM | Focus work |
| 4:30 PM | Wrap up and planning |`;
    headline = 'Afternoon productivity scheduled! 🚀';
  } else {
    // Evening schedule
    scheduleMarkdown = `| Time | Task |
|------|------|
| 6:00 PM | Wind down |
| 7:00 PM | Personal time |
| 8:00 PM | Review day |
| 9:00 PM | Relax |`;
    headline = 'Evening routine planned! 🌙';
  }
  
  const response = {
    scheduleMarkdown,
    headline
  };
  
  console.log('Sending response:', response);
  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Endpoints:');
  console.log('  POST /planday - Plan My Day API');
  console.log('  GET /health - Health check');
});
