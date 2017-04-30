const memdb = require('memdb')
const bots = require('@tradle/bots')
const { fakeWrapper } = require('@tradle/bots/test/utils')
const {
  Promise,
  co,
  createSimpleMessage
} = bots.utils

const collect = Promise.promisify(require('stream-collector'))

function loudCo (gen) {
  return co(function* (...args) {
    try {
      yield co(gen)(...args)
    } catch (err) {
      console.error(err)
      throw err
    }
  })
}

const test = require('tape')
const indexMessages = require('./')

test('basic', loudCo(function* (t) {
  t.plan(2)

  const bot = bots.bot({
    inMemory: true,
    send: function () {
      return Promise.resolve(fakeWrapper({
        from: 'bill',
        to: 'ted',
        object: {
          _t: 'something',
          hey: 'ho'
        }
      }))
    }
  })

  const userId = 'bill'
  const db = memdb({ valueEncoding: 'utf8' })
  const indexed = bot.use(indexMessages({
    db,
    map: function indexSentReceived ({ user, wrapper }) {
      return [
        wrapper.metadata.message.inbound ? 'received' : 'sent'
      ]
    }
  }))

  bot.hook('postsend', co(function* ({ user, data }) {
    const results = yield collect(indexed.createReadStream('sent'))
    t.same(results, [{ userId, index: 0 }])
  }))

  bot.hook('postreceive', co(function* ({ user, data }) {
    const results = yield collect(indexed.createReadStream('received'))
    t.same(results, [{ userId, index: 1 }])
  }))

  yield bot.send({
    userId: userId,
    object: `hey ${userId}`
  })

  const object = createSimpleMessage('hey')
  yield bot.receive(fakeWrapper({
    from: 'bill',
    to: 'ted',
    object: {
      _t: 'something',
      ho: 'hey'
    }
  }))
}))
