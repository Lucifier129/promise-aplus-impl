const delay = (f, time = 0) => value => setTimeout(() => f(value), time)
const isFunction = obj => typeof obj === "function"
const toString = Object.prototype.toString
const isObject = obj => toString.call(obj) === "[object Object]"
const isThenable = obj => (isObject(obj) || isFunction(obj)) && "then" in obj

const PENDING = "pending"
const FULFILLED = "fulfilled"
const REJECTED = "rejected"

const notify = (listener, state, value, reason) => {
  let { onFulfilled, onRejected, resolve, reject } = listener
  try {
    if (state === FULFILLED) {
      isFunction(onFulfilled) ? resolve(onFulfilled(value)) : resolve(value)
    } else if (state === REJECTED) {
      isFunction(onRejected) ? resolve(onRejected(reason)) : reject(reason)
    }
  } catch (error) {
    reject(error)
  }
}

const notifyAll = delay(promise => {
  let { listeners, state, value, reason } = promise
  while (listeners.length) notify(listeners.shift(), state, value, reason)
})

function Promise(f) {
  this.state = PENDING
  this.listeners = []
  let handleValue = value => {
    if (value === this) {
      return handleReason(new TypeError("Can not fufill promise with itself"))
    }
    if (value instanceof Promise) {
      return value.then(handleValue, handleReason)
    }
    if (isThenable(value)) {
      try {
        let then = value.then
        if (isFunction(then)) return handleValue(new Promise(then.bind(value)))
      } catch (error) {
        return handleReason(error)
      }
    }
    this.state = FULFILLED
    this.value = value
    notifyAll(this)
  }
  let handleReason = reason => {
    this.state = REJECTED
    this.reason = reason
    notifyAll(this)
  }
  let ignore = false
  let resolve = value => {
    if (ignore) return
    ignore = true
    handleValue(value)
  }
  let reject = reason => {
    if (ignore) return
    ignore = true
    handleReason(reason)
  }
  try {
    f(resolve, reject)
  } catch (error) {
    reject(error)
  }
}

Promise.prototype.then = function(onFulfilled, onRejected) {
  return new Promise((resolve, reject) => {
    this.listeners.push({ onFulfilled, onRejected, resolve, reject })
    this.state !== PENDING && notifyAll(this)
  })
}

Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected)
}

Promise.resolve = value => new Promise(resolve => resolve(value))
Promise.reject = reason => new Promise((_, reject) => reject(reason))
Promise.all = (promises = []) => {
  return new Promise((resolve, reject) => {
    let values = []
    let onFulfilled = value => {
      values.push(value) === promises.length && resolve(values)
    }
    promises.forEach(promise => promise.then(onFulfilled, reject))
  })
}
Promise.race = (promises = []) => {
  return new Promise((resolve, reject) =>
    promises.forEach(promise => promise.then(resolve, reject))
  )
}

module.exports = Promise
