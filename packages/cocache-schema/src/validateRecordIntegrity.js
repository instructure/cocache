'use strict';

function validate(value, checker, ctx, path) {
  if (checker === null) {
    return;
  }

  if (checker.$meta && checker.$meta.type === "shape") {
    validateObject(value, checker, ctx, path);
  }
  else if (checker.$meta && checker.$meta.type === "arrayOf") {
    validateArray(value, checker, ctx, path);
  }
  else {
    validatePrimitive(value, checker, ctx, path);
  }
}

function validateObject(value, checker, ctx, path) {
  if (!checker) {
    return;
  }
  else if (value === undefined && isRequired(checker)) {
    ctx.onError(`Attribute "${path}" is missing, expected an object.`);
    return;
  }
  else if (value === undefined || value === null) {
    return;
  }
  else if (typeof value !== 'object') {
    ctx.onError(`Attribute "${path}" is expected to be of type "object" and not "${typeof value}".`);
    return;
  }

  const permittedKeys = Object.keys(checker.$meta.args);

  Object.keys(value).forEach(function validateObjectPropertyType(propName) {
    const propPath = path ? `${path}.${propName}` : propName;

    if (permittedKeys.indexOf(propName) === -1) {
      ctx.onError(`Attribute "${propPath}" of type "${typeof value[propName]}" is not specified in the schema.`);
    }
    else {
      validate(value[propName], checker.$meta.args[propName], ctx, propPath);
    }
  });

  permittedKeys.forEach(function ensureAttributeIsPresent(propName) {
    const propPath = path ? `${path}.${propName}` : propName;

    if (isRequired(checker.$meta.args[propName]) && !value.hasOwnProperty(propName)) {
      ctx.onError(`Attribute "${propPath}" is missing.`)
    }
  });
}

function validateArray(value, checker, ctx, path) {
  if (!value && isRequired(checker)) {
    ctx.onError(`Attribute "${path}" is missing, expected an array.`);
  }
  else if (!value) {
    return;
  }
  else if (!Array.isArray(value)) {
    ctx.onError(`Attribute "${path}" is not an array.`);
  }
  else {
    value.forEach(function(item, index) {
      const itemPath = path ? `${path}.[${index}]` : `[${index}]`;

      validate(item, checker.$meta.args, ctx, itemPath);
    });
  }
}

function validatePrimitive(value, checker, ctx, path) {
  if (typeof checker !== 'function') {
    console.warn('cocache-schema: checker does not seem to be a valid function');
    console.warn('DEBUG: ');
    console.warn('\tObject path:', path);
    console.warn('\tChecker:', checker);
    console.warn('\tValue:', value);
    return;
  }

  const error = checker({ [path]: value }, path, ctx.displayName, 'prop');

  if (error) {
    ctx.onError(error);
  }
}

function isRequired(checker) {
  return typeof checker === "function" && !checker.hasOwnProperty("isRequired");
}

module.exports = validate;
