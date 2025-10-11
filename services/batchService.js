// services/batchService.js
const { notion } = require('../config/notion');

/**
 * Universal Batch Service for both Tasks and Dynamic databases
 * Handles parallel processing, rate limiting, and error recovery
 */
class BatchService {
  constructor() {
    // Configurable settings
    this.config = {
      maxParallel: 10,        // Max concurrent requests to Notion
      chunkSize: 10,          // Process in chunks of 10
      retryAttempts: 2,       // Retry failed items twice
      delayBetweenChunks: 100 // ms delay between chunks
    };
  }

  /**
   * Process items in batches with error handling
   * @param {Array} items - Array of items to process
   * @param {Function} processor - Async function to process each item
   * @returns {Object} Results with successful and failed items
   */
  async processBatch(items, processor) {
    console.log(`📦 Processing batch of ${items.length} items...`);
    
    const results = {
      successful: [],
      failed: [],
      total: items.length,
      duration: 0
    };

    const startTime = Date.now();

    // Process in chunks to avoid overwhelming Notion API
    for (let i = 0; i < items.length; i += this.config.chunkSize) {
      const chunk = items.slice(i, i + this.config.chunkSize);
      
      console.log(`  Processing chunk ${Math.floor(i / this.config.chunkSize) + 1}/${Math.ceil(items.length / this.config.chunkSize)}`);
      
      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map((item, index) => 
          processor(item)
            .then(result => ({ 
              index: i + index, 
              item, 
              result, 
              success: true 
            }))
            .catch(error => ({ 
              index: i + index, 
              item, 
              error: error.message, 
              success: false 
            }))
        )
      );

      // Collect results
      chunkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.successful.push(result.value);
          } else {
            results.failed.push(result.value);
          }
        } else {
          results.failed.push({
            index: -1,
            error: result.reason.message,
            success: false
          });
        }
      });

      // Add delay between chunks to respect rate limits
      if (i + this.config.chunkSize < items.length) {
        await this.delay(this.config.delayBetweenChunks);
      }
    }

    // Retry failed items once
    if (results.failed.length > 0 && this.config.retryAttempts > 0) {
      console.log(`  Retrying ${results.failed.length} failed items...`);
      
      const retryItems = results.failed.splice(0); // Clear failed array
      
      for (const failedItem of retryItems) {
        try {
          const result = await processor(failedItem.item);
          results.successful.push({
            ...failedItem,
            result,
            success: true,
            retried: true
          });
        } catch (error) {
          results.failed.push({
            ...failedItem,
            error: error.message,
            retryFailed: true
          });
        }
      }
    }

    results.duration = Date.now() - startTime;
    
    console.log(`✅ Batch complete: ${results.successful.length} successful, ${results.failed.length} failed (${results.duration}ms)`);
    
    return results;
  }

  /**
   * Create multiple database entries in batch
   * @param {string} databaseId - Database ID
   * @param {Array} entries - Array of entries with properties
   * @returns {Object} Batch results
   */
  async createEntries(databaseId, entries) {
    const processor = async (entry) => {
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: entry
      });
      return {
        id: response.id,
        createdTime: response.created_time
      };
    };

    return this.processBatch(entries, processor);
  }

  /**
   * Update multiple database entries in batch
   * @param {Array} updates - Array of {id, properties} objects
   * @returns {Object} Batch results
   */
  async updateEntries(updates) {
    const processor = async (update) => {
      const response = await notion.pages.update({
        page_id: update.id,
        properties: update.properties
      });
      return {
        id: response.id,
        lastEditedTime: response.last_edited_time
      };
    };

    return this.processBatch(updates, processor);
  }

  /**
   * Archive multiple database entries in batch
   * @param {Array} ids - Array of entry IDs to archive
   * @returns {Object} Batch results
   */
  async archiveEntries(ids) {
    const processor = async (id) => {
      await notion.pages.update({
        page_id: id,
        archived: true
      });
      return { id, archived: true };
    };

    return this.processBatch(ids, processor);
  }

  /**
   * Helper: Add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Configure batch settings
   */
  configure(settings) {
    this.config = { ...this.config, ...settings };
  }
}

// Export singleton instance
module.exports = new BatchService();