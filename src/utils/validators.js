const Joi = require('joi');

const scanRequestSchema = Joi.object({
  image: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9\.\-\_\/\:]+$/)
    .messages({
      'string.pattern.base': 'Invalid image format'
    }),
  registry: Joi.string()
    .default('docker.io')
    .optional(),
  policies: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
});

function validateScanRequest(data) {
  return scanRequestSchema.validate(data, { abortEarly: false });
}

module.exports = {
  validateScanRequest
};
