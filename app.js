require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const taskRoutes = require('./routes/taskRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Import auth middleware
const apiKeyAuth = require('./middleware/authMiddleware');

// API routes with authentication
app.use('/api/tasks', apiKeyAuth, taskRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Notion Tasks API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes