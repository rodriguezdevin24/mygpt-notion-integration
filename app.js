require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const taskRoutes = require('./routes/taskRoutes');
const dynamicRoutes = require('./routes/dynamicRoutes');
const dynamicEntryRoutes = require('./routes/dynamicEntryRoutes')
const discoveryRoutes = require('./routes/discoveryRoutes');
const privacyRoutes = require('./routes/privacyRoutes')
const actionsRoutes = require('./routes/actionsRoutes');




// Import database registry
const databaseRegistry = require('./config/databaseRegistry');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies


// Initialize database registry
(async function() {
  try {
    await databaseRegistry.initialize();
    console.log('Database registry initialized');
    
    // Register the tasks database if it's not already in the registry
    if (!databaseRegistry.getDatabaseSchema(process.env.NOTION_TASKS_DATABASE_ID)) {
      const tasksSchema = {
        id: process.env.NOTION_TASKS_DATABASE_ID,
        name: 'Tasks',
        properties: {
          Task: { type: 'title', required: true },
          c: { type: 'checkbox' },
          'Due Date': { type: 'date' },
          Note: { type: 'rich_text' },
          Occurrence: { type: 'select' },
          'Time of Day': { type: 'multi_select' },
          Goals: { type: 'relation' },
          Priority: { type: 'select' }
        }
      };
      
      databaseRegistry.registerDatabase(tasksSchema);
      await databaseRegistry.saveSchema(tasksSchema);
      console.log('Registered existing tasks database in registry');
    }
  } catch (error) {
    console.error('Error initializing database registry:', error);
  }
})();

// API routes
app.use('/api/tasks/', taskRoutes);
app.use('/api/dynamic/', dynamicRoutes)
app.use('/api/dynamic/', dynamicEntryRoutes)
app.use('api/discovery/', discoveryRoutes)
app.use('/', privacyRoutes);
app.use('/api', actionsRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Notion Integration API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks',
      dynamic: '/api/dynamic'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
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

module.exports = app;