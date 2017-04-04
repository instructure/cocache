# cocache

Cocache is a library for caching objects in memory with special semantics for
dealing with collections of records.

## Installation

Pull it down from npm:

```shell
npm install --save cocache
```

You need an ES6 transpiler to use the module. Assuming you got that set-up,
simply require `cocache` and build your hot new cache instance:

```javascript
const Cocache = require('cocache');
const myCache = Cocache();
```

## API

Go [Cocache here]().

## Domain Collections

In Cocache, records may be referenced individually or through _domain
collections_ - a collection can be thought of like a database view in that it
defines the domain in which a certain set of records are relevant.

For example, in a Twitter-like application, a collection could be defined for a
list of user objects that are following a specific user, in which case the
collection is the list of people, the records are the user objects, and the
domain (its _id_) is the user being followed.

```javascript
cache.add({ id: '1', name: 'Alice' });
cache.add({ id: '2', name: 'Bob' });

cache.addToCollection('FOLLOWERS_OF_BOB', [{ id: '1' }]); // Alice
cache.getCollection('FOLLOWERS_OF_BOB'); // [{ id: '1', name: 'Alice' }]
```

## Object canonicalization

Cocache expects every individual record to be unique. When a collection is
defined, it is managed internally as a _shallow_ list; a list of _references_
to records. Any mutative operation that produces a change in a certain record 
will be reflected everywhere.

This semantic ensures that a record, mapped to an id, is always guaranteed to 
have the same representation - regardless of the source it was pulled from (i.e. `cache.get()` vs `cache.getCollection()`) and regardless of the 
operation that affected it (e.g. `cache.add()`, `cache.addToCollection`, etc.).

Here's a brief snippet that shows the implication of this:

```javascript
cache.add({ id: '1' });
cache.get('1');
// => { id: '1' }

cache.addToCollection({ projectId: '1' }, [{ id: '1', title: 'foo' }]);
cache.get('1');
// => { id: '1', title: 'foo' }

cache.getCollection({ projectId: '1' });
// => [{ id: '1', title: 'foo' }]
```

## Object integrity enforcement

It is usually a good idea to validate what goes inside a storage layer like
Cocache. To that end, Cocache provides you with a hook to validate each record 
that is going into the cache.

So long as each record yields a unique identifier, Cocache tries to make as 
few assumptions as possible about the shape of the data you're shoving into 
it and delegates the responsibility of validating the structure to the 
application layer.

To define a custom validation routine, pass in a list of functions to the
constructor under `recordValidators`.

Here's an example that requires each record to contain an `"id"` string 
property:

```javascript
const Cocache = require('cocache');
const cache = Cocache({
  recordValidators: [
    function(record, options, displayName) {
      if (typeof record.id !== 'string') {
        throw new Error(`
          Expected record to contain a string 'id' property.
          Source: Cocache[${displayName}]`
        );
      }
    }
  ]
});
```

A more sophisticated solution could be achieved by utilizing a strong-schema
validator module, such a React's PropTypes or [react-
schema](https://github.com/philcockfield/react-schema). The options passed to
the cache are also passed to your validator, utilize them!

See [../cocache-schema/README.md]() for adding a React
PropTypes-based structural validation layer to your cocaches.

## Content-change signals

Anytime the cache contents change, Cocache is able to emit a signal so that
you may render a UI or re-do anything that relies on the cache contents.

```javascript
const Cocache = require('cocache');
const cache = Cocache(function onChange() {
  console.log('cache contents have changed!');
});
```

### High-resolution change signals
 
A cache instance accepts an `optimized: Boolean` option, which is on by 
default, that allows it to perform deep equality checks between records,
resulting in accurate change signals.

These checks are done using [Immutable.JS](https://facebook.github.io/immutable-js/) and work great on objects that have no custom prototypes.

> This may become a costly operation if the records you're storing are 
> structurally complex, in which case I'd recommend to turn this off.
> 
> You should also turn it off if you don't really care about noise-signal 
> ratio (e.g. the change listeners are really cheap).

## Transactional operations

Cocache allows you to travel back in time (heh) and restore it to a previous 
state. This comes in handy when you want to optimistically apply the effects
of an operation that may or may not be rejected in the future (like a Promise 
or an API call response.)

See [Cocache#transaction]() and [Cocache#rollback]() for more information.

Below is an example of updating a user's name immediately and restoring it in 
case the API refuses to update that record:

```javascript
cache.transaction(function() {
  cache.add({ id: '1', name: 'Bongo' });

  return ajax({
    type: 'PATCH',
    url: '/users/1',
    data: { name: 'Bongo' }
  });
});
```

If the `Promise` yielded by `ajax` rejects, the cache's representation of the 
record `"1"` will be restored to what it was prior to making that `add` call.

## Record expiry & TTL

_TODO: not implemented yet_

## License

Cocache - Collection-aware memory storage.
Copyright (C) 2016-2017 Instructure, INC.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.