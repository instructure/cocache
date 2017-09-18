'use strict';

const Immutable = require('immutable');
const StringID = require('./StringID');

/**
 * @module Cocache
 *
 * @param {Object} options
 * @param {Function} [options.onChange]
 * @param {Function} [options.idGenerator]
 * @param {Array.<Cocache~RecordValidator>} [options.recordValidators=[]]
 * @param {String} [options.displayName='<<anonymous>>']
 * @param {Boolean} [options.optimized=true]
 *
 * @callback Cocache~RecordValidator
 *
 * @param {Any} record
 *        The record to validate.
 *
 * @param {Object} options
 *        The options the cache instance was built with.
 *
 * @param {String} displayName
 *        The cache instance's displayName. Use this in your error reporting.
 *
 * @return {void}
 */
function Cocache(maybeOptions) {
  let records = Immutable.Map();
  let collections = Immutable.Map();
  let snapshots  = Immutable.List([
    { records, collections } // initial snapshot
  ]);

  const options = maybeOptions || {};
  const onChange = options.onChange;
  const getId = options.idGenerator || defaultIdGenerator;
  const freezeObject = options.freezeObject || fnIdentity;
  const thawObject = options.thawObject || fnIdentity;
  const recordValidators = options.recordValidators || [];
  const displayName = options.displayName || '<<anonymous>>';

  const zombieGuardian = [];

  const cache = {
    /**
     * Add a record to the cache, or update the existing version if any.
     *
     * Note that records added directly will not be mapped to any collection
     * until you explicitly do so using [#addToCollection]().
     *
     * > **Change signals**
     * >
     * > This routine emits a change signal only if the record was newly added,
     * > or if it existed but its contents have changed.
     *
     * @param {Object} record
     * @param {String} record.id
     *        The only required field. This must be unique across all the
     *        records to be stored by this cache instance.
     *
     * @return {Boolean}
     *         Whether the record was newly added, or if it already existed,
     *         whether its contents have changed.
     */
    add(record) {
      assertRecordIsValid(record);

      const id = getId(record);

      if (zombieGuardian.indexOf(id) === -1) {
        zombieGuardian.push(id);
      }

      return update({
        records: records.set(id, freezeObject(record))
      });
    },

    /**
     * Add a collection of records to the cache.
     *
     * If the collection is already defined, the existing references will
     * **not** be discarded and this operation will be like a merge. If you want
     * to re-define a collection, use [#setCollection]().
     *
     * > **A note about unique references**
     * >
     * > This routine does NOT guard against duplicate references; if you add
     * > the same record twice, the collection will reference it twice. If this
     * > presents an issue, consider using [#setCollection]() or manually
     * > adjust the references yourself before calling this method.
     *
     * > **Change signals**
     * >
     * > This routine emits a change signal only if:
     * >
     * > - a record was newly added
     * > - an existing record had its contents changed
     * > - the records referenced by the collection have changed
     *
     * @param {Object} id
     *        The collection identifier.
     *
     * @param {Array.<Object>} records
     *
     * @return {Boolean}
     *         Whether the cache contents have changed; a record was newly
     *         inserted, an existing one had its contents modified, or the
     *         collection references have changed.
     *
     * @example
     *
     *     cache.addToCollection({ courseId: '1' }, [
     *       { id: 'slide1' },
     *       { id: 'slide2' }
     *     ]);
     *     // => true
     *
     *     console.log(cache.getCollection({ courseId: '1' }).length);
     *     // => 2
     *
     *     cache.addToCollection({ courseId: '1' }, [
     *       { id: 'slide3' }
     *     ]);
     *     // => true
     *
     *     console.log(cache.getCollection({ courseId: '1' }).length);
     *     // => 3
     *
     */
    addToCollection(id, newRecords) {
      assertRecordsAreValid(newRecords);

      const key = StringID(id);

      return update({
        // Update the canonical versions of the records:
        records: newRecords.reduce((map, record) => map.set(getId(record), freezeObject(record)), records),

        // Add the references to the canonical records in the collection:
        collections: collections.set(key, Collection(key).concat(newRecords.map(getId)))
      });
    },

    /**
     * Retrieve a record.
     *
     * @param {String} id
     *        The record identifier (its @id property).
     *
     * @return {Object}
     */
    get(id) {
      if (records.has(id)) {
        return thawObject(records.get(id));
      }
      else {
        return undefined;
      }
    },

    /**
     * Retrieve the set of records within a certain collection.
     *
     * @param  {Object} id
     * @return {Array.<Object>}
     */
    getCollection(id) {
      return Collection(StringID(id)).map(cache.get).toJS();
    },

    /**
     * A convenience method for inserting a record (or multiple) at the front of
     * a collection.
     *
     * This is useful for cases where you want newly-added items to show up
     * first in a UI.
     *
     * @param  {Object} id
     * @param  {Object|Array.<Object>} newRecords
     *
     * @return {Boolean}
     *         Whether the cache contents have changed, which is most likely
     *         always true in this case.
     */
    unshiftInCollection(id, newRecords) {
      const recordSet = arrayWrap(newRecords);

      assertRecordsAreValid(recordSet);

      update({
        records: recordSet.reduce((map, record) => {
          return map.set(getId(record), freezeObject(record));
        }, records)
      });

      return cache.setCollection(id, recordSet.concat(cache.getCollection(id)));
    },

    /**
     * Replace all records for a collection.
     *
     * Records that do not exist will be added to the cache, and existing ones
     * will be updated. Records that are no longer referenced by any collection
     * will be removed (aka zombies).
     *
     * @example
     *
     *     cache.setCollection({ courseId: '1' }, [{ id: 'slide1' }, { id: 'slide2' }]);
     *     cache.get('slide1'); // => { id: 'slide1' };
     *     cache.get('slide2'); // => { id: 'slide2' };
     *     cache.getCollection({ courseId: '1' }).length; // 2
     *
     * @example Clearing a collection
     *
     *     cache.setCollection({ courseId: '1' }, []);
     *
     * @param {Object} id
     * @param {Array.<Object>} newRecords
     *
     * @return {Boolean}
     *         Whether the contents have changed.
     */
    setCollection(id, newRecords) {
      assertRecordsAreValid(newRecords);

      const newCollections = collections.set(StringID(id), Immutable.List(newRecords.map(getId)));
      const mergedRecords = newRecords
        // update the canonical representations
        .reduce((map, record) => map.set(getId(record), freezeObject(record)), records)
        // remove zombie records
        .filter((_, recordId) => {
          return (
            zombieGuardian.indexOf(recordId) > -1 ||
            newCollections.some(list => list.indexOf(recordId) > -1)
          );
        })
      ;

      return update({
        records: mergedRecords,
        collections: newCollections
      });
    },

    /**
     * Remove a record from the cache and all references to it across all
     * collections.
     *
     *     cache.add({ id: '1' }); // => true
     *     cache.remove('1'); // => true
     *
     *     cache.addToCollection({ courseId: '1' }, [{ id: '1' }]);
     *     cache.remove('1');
     *     cache.getCollection({ courseId: '1' }); // => []
     *
     * @param {String} id
     *        The record identifier.
     *
     * @return {Boolean}
     *         Whether the record was found and removed.
     */
    remove(id) {
      if (records.has(id)) {
        zombieGuardian.splice(zombieGuardian.indexOf(id), 1);

        return update({
          records: records.delete(id),
          collections: collections.map((list) => {
            const index = list.indexOf(id);

            if (index > -1) {
              return list.delete(list.indexOf(id));
            }
            else {
              return list;
            }
          })
        });
      } else {
        return false;
      }
    },

    /**
     * Perform a transactional routine (sync or async); failure will cause the
     * cache to roll-back to its original state prior to running the routine.
     *
     * @param  {Function} worker
     *         Your cache worker routine which MUST yield a promise.
     *
     * @return {Promise}
     */
    transaction(worker) {
      const cursor = snapshots.count();

      return worker().then(null, (error) => {
        cache.rollback(snapshots.count() - cursor);

        return error;
      });
    },

    /**
     * Roll-back the cache to an earlier state. AKA, the "undo" button.
     *
     * @param  {Number} [steps=1]
     *         How many states to go back.
     */
    rollback(inSteps) {
      const steps = Math.max(inSteps || 0, 1);

      if (steps > snapshots.count()) {
        throw new Error('You are attempting to roll-back to a state that does not exist!');
      }

      return update(snapshots.get(snapshots.count() - (steps+1)));
    },

    /**
     * Clear the cache of all records and collections.
     */
    clear() {
      zombieGuardian.splice(0);

      return update({
        records: Immutable.Map(),
        collections: Immutable.Map(),
      });
    },

    isEmpty() {
      return records.count() === 0;
    },
  };

  function update(params) {
    let hasChanged = false;

    // TODO: we can optimize this by skipping one of the checks in case the
    // other checks out, preferably the records one since it's more costly
    if (params.hasOwnProperty('records') && !Immutable.is(params.records, records)) {
      records = params.records;
      hasChanged = true;
    }

    if (params.hasOwnProperty('collections') && !Immutable.is(params.collections, collections)) {
      collections = params.collections;
      hasChanged = true;
    }

    if (hasChanged) {
      snapshots = snapshots.push({ records, collections });

      if (onChange) {
        onChange();
      }
    }

    return hasChanged;
  }

  // find an existing collection or build a blank one
  function Collection(key) {
    return collections.get(key) || Immutable.List();
  }

  function assertRecordIsValid(record) {
    recordValidators.forEach(function(fn) {
      fn(record, options, displayName);
    });

    devmodeInvariant(typeof getId(record) === 'string',
      'Record must have a string identifier (an @id property).',
      `Offending object: ${tryDump(record)}`
    );
  }

  function assertRecordsAreValid(list) {
    if (!Array.isArray(list)) {
      throw new Error('You must pass an array of records when using a collection.');
    }

    list.forEach(assertRecordIsValid);
  }

  return cache;
}

function defaultIdGenerator(x) {
  return x.id;
}

function fnIdentity(x) {
  return x;
}

function devmodeInvariant(predicate, message, devMessage) {
  if (!predicate) {
    const errorMessage = process.env.NODE_ENV === 'production' ?
      message :
      `${message}\nDevelopment Trace:\n${devMessage}`
    ;

    throw new Error(errorMessage);
  }
}

function arrayWrap(x) {
  return x === undefined ? [] : [].concat(x);
}

function tryDump(record) {
  try {
    return JSON.stringify(record);
  }
  catch(_) {
    return String(record);
  }
}

module.exports = Cocache;
