const delay = (f, time = 0) => value => setTimeout(() => f(value), time)
const isFunction = obj => typeof obj === 'function'
const toString = Object.prototype.toString
const isObject = obj => toString.call(obj) === '[object Object]'
const isThenable = obj => (isObject(obj) || isFunction(obj)) && 'then' in obj
const isPromise = promise => promise instanceof Promise

const PENDING = Symbol('pending')
const FULFILLED = Symbol('fulfilled')
const REJECTED = Symbol('rejected')

const notify = (handler, state, result) => {
	let { onFulfilled, onRejected, resolve, reject } = handler
	try {
		if (state === FULFILLED) {
			isFunction(onFulfilled) ? resolve(onFulfilled(result)) : resolve(result)
		} else if (state === REJECTED) {
			isFunction(onRejected) ? resolve(onRejected(result)) : reject(result)
		}
	} catch (error) {
		reject(error)
	}
}

const notifyAll = delay(promise => {
	let { handlers, state, result } = promise
	while (handlers.length) notify(handlers.shift(), state, result)
})

const transition = (promise, state, result) => {
	if (promise.state !== PENDING) return
	promise.state = state
	promise.result = result
	notifyAll(promise)
}

const checkValue = (promise, value, onFulfilled, onRejected) => {
	if (value === promise) {
		let reason = new TypeError('Can not fufill promise with itself')
		return onRejected(reason)
	}
	if (value instanceof Promise) {
		return value.then(onFulfilled, onRejected)
	}
	if (isThenable(value)) {
		try {
			let then = value.then
			if (isFunction(then)) {
				return new Promise(then.bind(value)).then(onFulfilled, onRejected)
			}
		} catch (error) {
			return onRejected(error)
		}
	}
	onFulfilled(value)
}

function Promise(f) {
	this.state = PENDING
	this.handlers = []
	let onFulfilled = value => transition(this, FULFILLED, value)
	let onRejected = reason => transition(this, REJECTED, reason)
	let ignore = false
	let resolve = value => {
		if (ignore) return
		ignore = true
		checkValue(this, value, onFulfilled, onRejected)
	}
	let reject = reason => {
		if (ignore) return
		ignore = true
		onRejected(reason)
	}
	try {
		f(resolve, reject)
	} catch (error) {
		reject(error)
	}
}

Promise.prototype.then = function(onFulfilled, onRejected) {
	return new Promise((resolve, reject) => {
		this.handlers.push({ onFulfilled, onRejected, resolve, reject })
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
		let count = 0
		let values = new Array(promises.length)
		let collectValue = index => value => {
			values[index] = value
			count += 1
			count === promises.length && resolve(values)
		}
		promises.forEach((promise, i) => {
			if (isPromise(promise)) {
				promise.then(collectValue(i), reject)
			} else {
				collectValue(i)(promise)
			}	
		})
	})
}
Promise.race = (promises = []) => {
	return new Promise((resolve, reject) =>
		promises.forEach(promise => {
			if (isPromise(promise)) {
				promise.then(resolve, reject)
			} else {
				resolve(promise)
			}
		})
	)
}

module.exports = Promise
