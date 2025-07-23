const express = require('express');
const router = express.Router();
const DatabaseFactory = require('../utils/databaseFactory');

/**
 * Factory routes for creating common database types
 */

// Create a project database
router.post('/project', async (req, res) => {
  try {
    const { name, tags, parentProjectId, icon, cover, parentPageId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Database name is required'
      });
    }
    
    const schema = await DatabaseFactory.createProjectDatabase(name, {
      tags,
      parentProjectId,
      icon,
      cover,
      parentPageId
    });
    
    res.status(201).json({ success: true, schema });
  } catch (error) {
    console.error('Error creating project database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create project database',
      error: error.message
    });
  }
});

// Create a task database
router.post('/tasks', async (req, res) => {
  try {
    const { name, projectId, tags, hasAssignee, assignees, icon, cover } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Database name is required'
      });
    }
    
    const schema = await DatabaseFactory.createTaskDatabase(name, projectId, {
      tags,
      hasAssignee,
      assignees,
      icon,
      cover
    });
    
    res.status(201).json({ success: true, schema });
  } catch (error) {
    console.error('Error creating task database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create task database',
      error: error.message
    });
  }
});

// Create a meeting notes database
router.post('/meetings', async (req, res) => {
  try {
    const { name, participants, tags, projectId, icon, cover } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Database name is required'
      });
    }
    
    const schema = await DatabaseFactory.createMeetingNotesDatabase(name, {
      participants,
      tags,
      projectId,
      icon,
      cover
    });
    
    res.status(201).json({ success: true, schema });
  } catch (error) {
    console.error('Error creating meeting notes database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create meeting notes database',
      error: error.message
    });
  }
});

// Create a contact database
router.post('/contacts', async (req, res) => {
  try {
    const { name, categories, icon, cover } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Database name is required'
      });
    }
    
    const schema = await DatabaseFactory.createContactDatabase(name, {
      categories,
      icon,
      cover
    });
    
    res.status(201).json({ success: true, schema });
  } catch (error) {
    console.error('Error creating contact database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create contact database',
      error: error.message
    });
  }
});

// Create a custom database
router.post('/custom', async (req, res) => {
  try {
    const { name, properties, icon, cover } = req.body;
    if (!name || !properties) {
      return res.status(400).json({
        success: false,
        message: 'Database name and properties are required'
      });
    }
    
    const schema = await DatabaseFactory.createCustomDatabase({
      name,
      properties,
      icon,
      cover
    });
    
    res.status(201).json({ success: true, schema });
  } catch (error) {
    console.error('Error creating custom database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create custom database',
      error: error.message
    });
  }
});

module.exports = router;
