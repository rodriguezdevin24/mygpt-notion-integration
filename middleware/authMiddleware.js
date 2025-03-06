/**
 * Middleware for API key authentication
 */

// Your API key will be stored in environment variables
const API_KEY = process.env.API_KEY;

/**
 * Middleware to validate API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const apiKeyAuth = (req, res, next) => {
  // Get the API key from the request headers
  const apiKey = req.headers['x-api-key'];
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  // Validate the API key
  if (apiKey !== API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  // If API key is valid, proceed to the next middleware/route handler
  next();
};

module.exports = apiKeyAuth;