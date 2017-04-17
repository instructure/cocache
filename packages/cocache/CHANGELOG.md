# 1.1.0

Removed deprecated APIs:

`#add`:

- `#add(collKey: Object, record: Object)` is no longer supported. Use
  `#addToCollection` instead
- `#add(collKey: Object, records: Array<Object>)` is no longer supported; use
  `#addToCollection` instead
- `#add(id: String|Number, record: Object)` is no longer supported, use
  `#add(record: Object)` instead and override the key generator fn if needed

`#get`:

- Calling `#get()` to retrieve the "default" aggregate is no longer supported
- Calling `#get('all')` to retrieve the "default" aggregate is no longer
  supported
- Calling `#get(collKey: Object)` to retrieve a collection is no longer
  supported; use `#getCollection` instead

`#getAll()` has been removed:

- Calling `#getAll()` or `#getAll('all')` to retrieve the "default" aggregate
  is no longer supported, call `#getCollection({})` explicitly instead
- Calling `#getAll(collKey: Object)`  is no longer supported, call
  `#getCollection` instead

`#set` has been removed:

- Calling `#set(collKey: Object, records: Array<Object>)` to replace a
  collection's record is no longer supported, use `#setCollection` instead
- Calling `#set(collKey: Object, record: Object)` to replace a single record in
  a collection is no longer supported since records now have a canonical
  representation.
- Calling `#set(id: Number|String, record: Object)` to replace an existing
  record is no longer supported. Use `#add` instead.

Other deprecation changes:

- `#has` has been removed
- `#clearAggregate` has been removed
- `#_updateAggregates` has been removed
- `#_updateAggregateItem` has been removed
- `#_removeAggregateItem` has been removed

# 1.0.0

Public release from Bridge.