// utils/notionFormulas.js
const PROVEN_NOTION_FORMULAS = {
  // Percentage calculations
  completionRate: 'if(prop("{total}") > 0, prop("{completed}") / prop("{total}"), 0)',
  
  // Status based on percentage  
  healthStatus: 'if(prop("{percent}") > 0.8, "Good", if(prop("{percent}") >= 0.5, "At Risk", "Critical"))',
  
  // Budget calculations
  budgetPerItem: 'if(prop("{count}") > 0, prop("{budget}") / prop("{count}"), 0)',
  budgetStatus: 'if(prop("{spent}") > prop("{budget}"), "Over Budget", "On Budget")',
  budgetOverUnder: 'prop("{budget}") - prop("{spent}")',
  
  // Time calculations
  daysRemaining: 'dateBetween(prop("{dueDate}"), now(), "days")',
  daysOverdue: 'if(dateBetween(now(), prop("{dueDate}"), "days") > 0, dateBetween(now(), prop("{dueDate}"), "days"), 0)',
  daysSince: 'dateBetween(prop("{startDate}"), now(), "days")',
  
  // Text combinations
  fullName: 'prop("{first}") + " " + prop("{last}")',
  titleWithStatus: 'prop("{title}") + " (" + prop("{status}") + ")"',
  
  // Common business formulas
  revenueProjection: 'prop("{amount}") * prop("{probability}")',
  profitMargin: 'if(prop("{revenue}") > 0, (prop("{revenue}") - prop("{cost}") / prop("{revenue}"), 0)',
  
  // Conditional status
  taskStatus: 'if(prop("{completed}"), "Done", if(prop("{dueDate}") < now(), "Overdue", "Pending"))',
  priorityLevel: 'if(prop("{score}") > 80, "High", if(prop("{score}") > 50, "Medium", "Low"))'
};

/**
 * Get a formula with property names substituted
 * @param {string} formulaKey - Key from PROVEN_NOTION_FORMULAS
 * @param {Object} replacements - Object with replacement values
 * @returns {string} - Formula with substituted property names
 */
function getFormula(formulaKey, replacements = {}) {
  let formula = PROVEN_NOTION_FORMULAS[formulaKey];
  if (!formula) {
    throw new Error(`Formula '${formulaKey}' not found`);
  }
  
  // Replace placeholders with actual property names
  for (const [placeholder, propertyName] of Object.entries(replacements)) {
    formula = formula.replace(new RegExp(`{${placeholder}}`, 'g'), propertyName);
  }
  
  return formula;
}

/**
 * Validate basic formula syntax
 * @param {string} expression - Formula expression
 * @returns {Array} - Array of potential issues
 */
function validateFormulaBasics(expression) {
  const issues = [];
  
  if (expression.includes('prop(\\"')) {
    issues.push('Use single quotes: prop("Name") not prop(\\"Name\\")');
  }
  
  if (expression.includes('===') || expression.includes('!==')) {
    issues.push('Use == and != instead of === and !== in Notion formulas');
  }
  
  if (expression.includes('&&') || expression.includes('||')) {
    issues.push('Use and() and or() functions instead of && and ||');
  }
  
  return issues;
}

module.exports = {
  PROVEN_NOTION_FORMULAS,
  getFormula,
  validateFormulaBasics
};