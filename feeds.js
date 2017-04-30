const shallowExtend = require('xtend/mutable')
const sub = require('subleveldown')
const prefix = require('sublevel-prefixer')()
const lexint = require('lexicographic-integer')
const _createFeed = require('changes-feed')
const {
  Promise,
  co
} = require('@tradle/bots').utils

function createFeed (db) {
  return _createFeed(db, { start: 0 })
}

const FEED_DB_OPTS = { valueEncoding: 'json' }

module.exports = function createFeeds (opts) {
  const { bot, db } = opts
  const feeds = {}

  function ensureFeed (feed) {
    if (!feeds[feed]) {
      feeds[feed] = createFeed(sub(db, feed, FEED_DB_OPTS))
      Promise.promisifyAll(feeds[feed])
    }

    return feeds[feed]
  }

  function appendToFeed ({ feed, value }) {
    return ensureFeed(feed).appendAsync(value)
  }

  function createReadStream (index, opts={}) {
    return ensureFeed(index).createReadStream(shallowExtend({
      keys: false
    }, opts))
  }

  return {
    feed: ensureFeed,
    append: appendToFeed,
    createReadStream
  }
}

function hexint (n) {
  return lexint(n, 'hex')
}
