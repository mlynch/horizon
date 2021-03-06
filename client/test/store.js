import { _do as tap } from 'rxjs/operator/do'
import { mergeMapTo } from 'rxjs/operator/mergeMapTo'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { toArray } from 'rxjs/operator/toArray'

import { assertCompletes,
         assertThrows,
         assertErrors,
         compareWithoutVersion,
         compareSetsWithoutVersion } from './utils'

const storeSuite = global.storeSuite = getData => () => {
  let data

  before(() => {
    data = getData()
  })

  // The `store` command stores documents in the database, and overwrites
  // them if they already exist.
  it('creates or replaces a document', assertCompletes(() =>
      data.store({ id: 1, a: 1, b: 1 })
      // The promise should return an array with an ID of the inserted
      // document.
      ::tap(res => compareWithoutVersion(res, { id: 1 }))
      // Let's make sure we get back the document that we put in.
      ::mergeMapTo(data.find(1).fetch())
      // Check that we get back what we put in.
      ::tap(res => compareWithoutVersion(res, { id: 1, a: 1, b: 1 }))
      // Let's overwrite the document now
      ::mergeMapTo(data.store({ id: 1, c: 1 }))
      // We should have gotten the ID back again
      ::tap(res => compareWithoutVersion(res, { id: 1 }))
      // Make sure `store` overwrote the original document
      ::mergeMapTo(data.find(1).fetch())
      // Check that we get back what we put in.
      ::tap(res => compareWithoutVersion(res, { id: 1, c: 1 }))
  ))

  // If we store a document without an ID, the ID is generated for us.
  // Let's run the same test as above (store the document and then
  // overwrite it), but have the ID be generated for us.
  it('generates ids for documents without them', assertCompletes(() => {
    let new_id

    return data.store({ a: 1, b: 1 })::toArray()
      ::tap(res => {
        // The promise should return an array with an ID of the
        // inserted document.
        assert.lengthOf(res, 1)
        assert.isObject(res[0])
        assert.isString(res[0].id)
        new_id = res[0].id
      })
      // Let's make sure we get back the document that we put in.
      ::mergeMap(() => data.find(new_id).fetch())
      // Check that we get back what we put in.
      ::tap(res => compareWithoutVersion({ id: new_id, a: 1, b: 1 }, res))
      // Let's overwrite the document now
      ::mergeMap(() => data.store({ id: new_id, c: 1 }))
      // We should have gotten the ID back again
      ::tap(res => assert.deepEqual(new_id, res.id))
      // Make sure `store` overwrote the original document
      ::mergeMap(() => data.find(new_id).fetch())
      // Check that we get back what we put in.
      ::tap(res => compareWithoutVersion({ id: new_id, c: 1 }, res))
  }))

  // Storing `null` is an error.
  it('fails if null is passed', assertThrows(
    'The argument to store must be non-null',
    () => data.store(null))
  )

  // Storing `undefined` is also an error.
  it('fails if undefined is passed', assertThrows(
    'The 1st argument to store must be defined',
    () => data.store(undefined)
  ))

  // Storing nothing is an error
  it('fails if no arguments are passed', assertThrows(
    'store must receive exactly 1 argument',
    () => data.store()
  ))

  // The `store` command allows storing multiple documents in one call.
  // Let's store a few kinds of documents and make sure we get them back.
  it('allows storing multiple documents in one call', assertCompletes(() => {
    let new_id_0, new_id_1

    return data.store([ {}, { a: 1 }, { id: 1, a: 1 } ])
      ::toArray()
      ::tap(res => {
        // The promise should return an array with the IDs of the documents
        // in order, including the generated IDS.
        assert.isArray(res)
        assert.lengthOf(res, 3)
        assert.isString(res[0].id)
        assert.isString(res[1].id)
        assert.equal(1, res[2].id)

        new_id_0 = res[0].id
        new_id_1 = res[1].id
      })
      // Make sure we get what we put in.
      ::mergeMap(() => data.findAll(new_id_0, new_id_1, 1)
               .fetch())
      // We're supposed to get an array of documents we put in
      ::tap(res => compareSetsWithoutVersion(res, [
        { id: new_id_0 },
        { id: new_id_1, a: 1 },
        { id: 1, a: 1 },
      ]))
  }))

  // If any operation in a batch store fails, everything is reported as a
  // failure. Note that we're storing `null` below, which is a failure.
  it('fails if any operation in a batch fails', assertErrors(() =>
    data.store([ { a: 1 }, null, { id: 1, a: 1 } ]),
    /must be an object/
  ))

  // Storing an empty batch of documents is ok, and returns an empty
  // array.
  it('allows storing empty batches', assertCompletes(() =>
    data.store([])::toArray()
      ::tap(res => {
        // The promise should return an array with the IDs of the documents
        // in order, including the generated IDS.
        assert.isArray(res)
        assert.lengthOf(res, 0)
      })
  ))

  it('stores date objects and retrieves them again', assertCompletes(() => {
    const originalDate = new Date()
    return data.store({ date: originalDate })::toArray()
      ::mergeMap(id => data.find(id[0]).fetch())
      ::tap(result => assert.deepEqual(originalDate, result.date))
  }))
} // Testing `store`
