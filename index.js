const shallowExtend = require('xtend/mutable')
const Promise = require('any-promise')
const co = require('co').wrap
const isPromise = obj => obj && typeof obj.then === 'function'
const createFeeds = require('./feeds')

module.exports = function indexMessage (opts) {
  return bot => install(bot, opts)
}

function install (bot, opts) {
  const { map } = opts
  const feeds = createFeeds(shallowExtend({ bot }, opts))
  const unsub = [
    bot.hook('postsend', indexer(map)),
    bot.hook('postreceive', indexer(map))
  ]

  function indexer (getIndices) {
    return co(function* (data) {
      const { user, wrapper } = data
      const { index } = wrapper.metadata
      let ret = getIndices(data)
      if (isPromise(ret)) ret = yield ret
      if (ret == null) return

      yield Promise.all([].concat(ret).map(val => {
        return feeds.append({
          feed: val,
          value: {
            userId: user.id,
            index
          }
        })
      }))
    })
  }

  function uninstall () {
    unsub.forEach(call)
  }

  return shallowExtend({
    uninstall
  }, feeds)
}

function call (fn) {
  fn()
}
