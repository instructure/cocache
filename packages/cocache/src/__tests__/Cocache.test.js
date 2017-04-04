'use strict';

const Subject = require('../Cocache');
const Immutable = require('immutable');
const { assert } = require('chai');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: "" });

describe('Cocache', function() {
  const sandbox = sinon.sandbox.create();

  let subject, onChange;

  beforeEach(function() {
    onChange = sandbox.stub();
    subject = Subject({ onChange });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#add', function() {
    context('with a scalar key', function() {
      it('should add it to the cache', function() {
        subject.add({ id: '1' });
        assert.ok(subject.get('1'));
      });

      it('should add it to collections that reference it', function() {
        const key = { party: 'time' };

        subject.addToCollection(key, [{ id: '1' }]);
        subject.add({ id: '1', title: 'foo' });

        assert.equal(subject.getCollection(key).length, 1);
        assert.equal(subject.getCollection(key)[0].title, 'foo');
      });

      it('should not add it to collections that do not reference it', function() {
        const setA = { party: 'time' };
        const setB = { party: 'pooper' };

        subject.addToCollection(setA, [{ id: '1' }]);
        subject.addToCollection(setB, [{ id: '2' }]);

        subject.add({ id: '1', title: 'foo' });

        assert.deepEqual(subject.getCollection(setA), [{ id: '1', title: 'foo' }]);
        assert.deepEqual(subject.getCollection(setB), [{ id: '2' }]);

        subject.add({ id: '3' });

        assert.deepEqual(subject.getCollection(setA), [{ id: '1', title: 'foo' }]);
        assert.deepEqual(subject.getCollection(setB), [{ id: '2' }]);
      });
    });

    context('with a composite key', function() {
      it('should require an array of records', function() {
        assert.throws(function() {
          subject.addToCollection({ party: 'time' }, { id: '1' });
        }, 'You must pass an array of records when using a collection.');
      });

      it('should add records only to that collection set', function() {
        subject.addToCollection({ party: 'time' }, [{ id: '1' }]);
        subject.addToCollection({ party: 'poop' }, [{ id: '2' }]);

        assert.deepEqual(subject.getCollection({ party: 'time' }).map(x => x.id), [ '1' ]);
        assert.deepEqual(subject.getCollection({ party: 'poop' }).map(x => x.id), [ '2' ]);
      });

      it('should update the canonical representation of those records', function() {
        subject.addToCollection({ party: 'time' }, [{ id: '1' }])
        subject.addToCollection({ party: 'poop' }, [{ id: '1', title: 'foo' }])

        assert.equal(subject.get('1').title, 'foo');
      });
    });

    describe('emitting change signals', function() {
      it('should if a record was added', function() {
        subject.add({ id: '1', title: 'foo' });
        assert.calledOnce(onChange);
      });

      it('should if a record was modified', function() {
        subject.add({ id: '1' });
        assert.calledOnce(onChange);

        subject.add({ id: '1', title: 'foo' });
        assert.calledTwice(onChange);
      });

      it('should not, if the objects are equal', function() {
        subject = Subject({
          onChange,
          freezeObject(x) { return Immutable.fromJS(x) },
          thawObject(x) { return x.toJS() },
        });

        subject.add({ id: '1', title: 'foo' });
        assert.calledOnce(onChange);

        subject.add({ id: '1', title: 'foo' });
        assert.calledOnce(onChange);
      });
    });
  });

  describe('#set', function() {
    it('should update the canonical representations of all records', function() {
      subject.add({ id: '1' });
      subject.setCollection({ party: 'time' }, [{ id: '1', title: 'foo' }, { id: '2' }])

      assert.equal(subject.get('1').title, 'foo');
      assert.ok(subject.get('2'));
    });

    it('should replace the collection references with the records specified', function() {
      subject.setCollection({ party: 'time' }, [{ id: '1' }, { id: '2' }]);
      assert.equal(subject.getCollection({ party: 'time' }).length, 2);

      subject.setCollection({ party: 'time' }, [{ id: '1' }]);
      assert.equal(subject.getCollection({ party: 'time' }).length, 1);
    });

    it('should remove zombie records', function() {
      subject.setCollection({ party: 'time' }, [{ id: '1' }, { id: '2' }]);
      assert.ok(subject.get('1'))
      assert.ok(subject.get('2'));

      subject.setCollection({ party: 'time' }, [{ id: '1' }]);
      assert.ok(subject.get('1'))
      assert.notOk(subject.get('2'));
    });

    describe('emitting change signals', function() {
      it('should if a record was added to the cache', function() {
        subject.setCollection({ party: 'time' }, [{ id: '1' }]);
        assert.calledOnce(onChange);
      });

      it('should if a record already existed but was only added as a reference to the set', function() {
        subject.add({ id: '1' });
        assert.calledOnce(onChange);

        subject.setCollection({ party: 'time' }, [{ id: '1' }]);
        assert.calledTwice(onChange);
      });

      it('should if a record contents were modified', function() {
        subject.addToCollection({ party: 'time' }, [{ id: '1', title: 'foo' }]);
        assert.calledOnce(onChange);

        subject.setCollection({ party: 'time' }, [{ id: '1', title: 'bar' }]);
        assert.calledTwice(onChange);
      });

      it('should if a record reference was removed', function() {
        subject.addToCollection({ party: 'time' }, [{ id: '1' }]);
        assert.calledOnce(onChange);

        subject.setCollection({ party: 'time' }, []);
        assert.calledTwice(onChange);
      });

      it('should not if the records are equal', function() {
        subject = Subject({
          onChange,
          freezeObject(x) { return Immutable.fromJS(x) },
          thawObject(x) { return x.toJS() },
        });

        subject.addToCollection({ party: 'time' }, [{ id: '1', title: 'foo' }]);
        assert.calledOnce(onChange);

        subject.setCollection({ party: 'time' }, [{ id: '1', title: 'foo' }]);
        assert.calledOnce(onChange);
      });
    });
  });

  describe('#remove', function() {
    it('should remove the record from the cache', function() {
      subject.add({ id: '1' });
      assert.ok(subject.get('1'));
      assert.ok(subject.remove('1'));
      assert.notOk(subject.get('1'));
    });

    it('should remove the record from all collections that reference it', function() {
      subject.add({ id: '1' });
      subject.addToCollection({ party: 'time' }, [{ id: '1' }]);

      assert.equal(subject.getCollection({ party: 'time' }).length, 1);

      assert.ok(subject.remove('1'));

      assert.equal(subject.getCollection({ party: 'time' }).length, 0);
    });

    it('is a no-op if the record does not exist', function() {
      assert.notOk(subject.remove('1'));
    });

    describe('emitting change signals', function() {
      it('should if a record existed and was removed', function() {
        subject.add({ id: '1', title: 'foo' });
        assert.calledOnce(onChange);

        subject.remove('1');
        assert.calledTwice(onChange);
      });

      it('should not, otherwise', function() {
        subject.remove('1');
        assert.notCalled(onChange);
      });
    });
  });

  describe('snapshotting', function() {
    it('should snapshot on #add()', function() {
      subject.add({ id: '1', title: 'foo' });
      subject.rollback(1);
      assert.equal(subject.get('1'), undefined);
    });

    it('should snapshot on #remove()', function() {
      subject.add({ id: '1', title: 'foo' });
      assert.ok(subject.get('1'));

      subject.remove('1');
      assert.notOk(subject.get('1'));

      subject.rollback(1);
      assert.ok(subject.get('1'));
    });

    it('should snapshot on #clear()', function() {
      subject.addToCollection({}, [{id: '1'}, {id: '2'}]);

      assert.equal(subject.getCollection({}).length, 2);

      subject.clear();

      assert.equal(subject.getCollection({}).length, 0);

      subject.rollback();

      assert.equal(subject.getCollection({}).length, 2);
    });
  });

  describe('#transaction', function() {
    it('should run the worker', function(done) {
      subject.transaction(() => {
        return Promise.resolve();
      }).then(function() {
        done();
      }, done);
    });

    it('should perform a rollback on failure', function(done) {
      sandbox.spy(subject, 'rollback');

      subject.transaction(function() {
        subject.add({ id: '1' });
        return Promise.reject();
      }).then(function() {
        assert.calledWith(subject.rollback, 1);
        done();
      }, done);
    });
  });

  describe('#rollback', function() {
    it('should rollback cache to earlier state', function() {
      subject.add({ id: '1', title: 'foo' });
      assert.ok(subject.get('1'));

      subject.rollback();
      assert.notOk(subject.get('1'));
    });

    it('should error if you try to rollback too many steps', function() {
      assert.throws(function() { subject.rollback(999); },
        'You are attempting to roll-back to a state that does not exist!'
      );
    });

    describe('emitting change signals', function() {
      it('should not if there was nothing to rollback', function() {
        subject.rollback();
        assert.notCalled(onChange);
      });

      it('should, otherwise', function() {
        subject.add({ id: '1' });
        assert.calledOnce(onChange);

        subject.rollback();
        assert.calledTwice(onChange);
      });
    });
  });

  describe('#unshiftInCollection', function() {
    it('should add the record', function() {
      subject.unshiftInCollection({}, { id: '1' });
      assert.ok(subject.get('1'));
      assert.deepEqual(subject.getCollection({}).map(x => x.id), ['1']);
    });

    it('should insert it at the front of the collection list', function() {
      subject.setCollection({ some: 'collection' }, [{ id: '2' }]);
      subject.unshiftInCollection({ some: 'collection' }, { id: '1' });

      assert.deepEqual(
        subject.getCollection({ some: 'collection' }).map(x => x.id),
        [ '1', '2' ]
      );
    });

    it('should update the canonical representation of the record', function() {
      subject.addToCollection({ some: 'key' }, [{ id: '1', broken: true }]);
      subject.unshiftInCollection({ some: 'key' }, [{id: '1', broken: false }]);

      assert.equal(subject.get('1').broken, false);
    });
  });

  describe('zombie records', function() {
    context('when a record is no longer referenced by any collection', function() {
      it('is kept if it was added individually', function() {
        subject.add({ id: '1' });

        assert.ok(subject.get('1'));

        subject.addToCollection({ a: 'a' }, [{ id: '1' }]);
        subject.setCollection({ a: 'a' }, []);

        assert.ok(subject.get('1'));
      });

      it('is discarded, otherwise', function() {
        subject.addToCollection({ a: 'a' }, [{ id: '1' }]);
        assert.ok(subject.get('1'));

        subject.setCollection({ a: 'a' }, []);
        assert.notOk(subject.get('1'));
      });
    });
  });
});
