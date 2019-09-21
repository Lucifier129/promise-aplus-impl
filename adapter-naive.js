const Promise = require('./src/naive')

const resolved = value => new Promise(resolve => resolve(value))
const rejected = reason => new Promise((_, reject) => reject(reason))

const deferred = () => {
  let promise, resolve, reject
  promise = new Promise(($resolve, $reject) => {
    resolve = $resolve
    reject = $reject
  })
  return { promise, resolve, reject }
}

module.exports = { resolved, rejected, deferred }
