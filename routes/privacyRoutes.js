// Create a routes file for static content
// privacy-routes.js

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Privacy policy route
router.get('/', (req, res) => {
  try {
    // Read the privacy policy HTML file
    const privacyPolicyPath = path.join(__dirname, '../public/privacy-policy.html');
    const privacyPolicy = fs.readFileSync(privacyPolicyPath, 'utf8');
    
    // Send the HTML content
    res.setHeader('Content-Type', 'text/html');
    res.send(privacyPolicy);
  } catch (error) {
    console.error('Error serving privacy policy:', error);
    res.status(500).send('Error loading privacy policy');
  }
});

module.exports = router;