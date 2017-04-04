const validateRecordIntegrity = require('./validateRecordIntegrity');

/**
 * @module CocacheSchema
 *
 * Validate a record against a [schema](https://github.com/philcockfield/react-schema).
 *
 * This function is a NO-OP if no schema is specified.
 *
 * @param {Object} record
 * @param {Object} options
 * @param {Object} options.schema
 *        An introspectable PropTypes schema like those provided by
 *        [react-schema](https://github.com/philcockfield/react-schema).
 *
 * @param {String?} displayName
 *        Human-readable name of the cache that is storing this record. Used for
 *        logging purposes when there are errors.
 *
 * @throws {Error}
 *         If the structure of the record does not conform to the schema.
 */
module.exports = function(record, options, displayName) {
  if (options.schema) {
    validateRecordIntegrity(record, options.schema, {
      displayName,
      onError: function(message) {
        throw new Error(`IntegrityViolation: ${message} (source: Cocache[${displayName}])`);
      }
    });
  }
};