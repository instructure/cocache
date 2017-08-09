'use strict';

const Cocache = require('cocache');
const Subject = require('../');
const { assert } = require('chai');
const { shape, string } = require('react-schema').PropTypes;

describe('cocache-schema', function() {
  let subject;

  beforeEach(function() {
    subject = Cocache({
      recordValidators: [ Subject ]
    });
  });

  it('validates individual records against the provided schema', function() {
    subject = Cocache({
      recordValidators: [ Subject ],
      displayName: 'foo',
      schema: shape({
        id: string,
        name: string
      }),
    });

    assert.throws(function() {
      subject.add({ id: '1', name: 5 });
    }, /Invalid prop `name` of type `number` supplied to `foo`, expected `string`/);
  });

  it('rejects missing required attributes', function() {
    subject = Cocache({
      recordValidators: [ Subject ],
      schema: shape({
        id: string,
        name: string.isRequired
      })
    });

    assert.throws(function() {
      subject.add({ id: '1' });
    }, /Attribute "name" is missing/);
  });

  it('rejects records with attributes not specified in the schema', function() {
    subject = Cocache({
      recordValidators: [ Subject ],
      schema: shape({
        id: string,
        name: string
      })
    });

    assert.throws(function() {
      subject.add({ id: '1', foo: 'bar' });
    }, /Attribute "foo" of type "string" is not specified in the schema/);
  });
});
