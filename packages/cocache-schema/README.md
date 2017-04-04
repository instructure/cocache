# cocache-schema

A [react-schema](https://github.com/philcockfield/react-schema) based validation layer for Cocache.

Cocache instances can accept a `schema` option that defines the structure of
the records that are expected to be stored within that cache.

## Installation

Pull it down from npm:

```shell
npm install --save cocache cocache-schema
```

You need an ES6 transpiler to use the module.

```javascript
const Cocache = require('cocache');
const { shape, string } = require('react-schema');

const cache = Cocache({
  recordValidators: [ require('cocache-schema') ],
  schema: shape({
    id: string,
    name: string
  })
});
```

## Validations

Let's assume we have a "user" cache with the following schema defined:

```javascript
const Cocache = require('cocache');
const { shape, string } = require('react-schema').PropTypes;

const cache = Cocache({
  displayName: 'UserCache',
  recordValidators: [ require('cocache-schema') ],
  schema: shape({
    id: string,
    name: string.isRequired
  })
});
```

### Required attributes

Attributes marked as `isRequired` will be required by every record going in to
the cache. Example:

```javascript
cache.add({ id: '1', name: 'Bongo' });
// => true

cache.add({ id: '2' });
// => Error("IntegrityViolation: Attribute "name" is missing. (source: Cocache[UserCache])")
```

### Unknown attributes

Attributes not found in the schema will be rejected. Very useful to make sure
you document every attribute you use and that you don't leak information you
shouldn't.

```javascript
cache.add({ id: '2', favoriteColor: 'bananas' });
// => Error("IntegrityViolation: Attribute "favoriteColor" is not specified in the schema. (source: Cocache[UserCache])")
```

### Invalid attributes

Attributes that have a type mis-match will be rejected.

```javascript
cache.add({ id: '2', name: 5 });
// => Error("IntegrityViolation: Invalid prop `name` of type `number` supplied to `UserCache`, expected `string`. (source: Cocache[UserCache])")
```

## License

cocache-schema - Strongly-typed schema validation for Cocache records.
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