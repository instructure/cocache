'use strict';

module.exports = function StringID(key, defaultKey) {
  if (typeof key === 'string') {
    return key;
  }
  else if (typeof key === 'number') {
    return String(key);
  }
  else if (key && typeof key === 'object') {
    return JSON.stringify(key);
  }
  else {
    return arguments.length === 2 ? StringID(defaultKey) : undefined;
  }
};