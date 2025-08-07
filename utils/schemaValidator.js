// utils/schemaValidator.js
const path = require("path");
const Ajv = require("ajv");

//Load the JSON schema for dynamic db specs
const schemaPath = path.join(__dirname,  "dynamicDbSpec.json");

const schema = require(schemaPath);

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

/**
 * Validate a dynamic database specification against the JSON Schema.
 * @param {Object} spec - Incoming spec to validate
 * @throws {Error} If validation fails, with .status = 400
 * @returns {Object} The validated spec
 */

function validateSpec(spec) {
  const valid = validate(spec);
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
    const err = new Error(`Invalid database spec: ${errors}`);
    err.status = 400;
    throw err;
  }
  return spec;
}

module.exports = { validateSpec };


