const { noop, of, throwError, Subject, asyncScheduler, observable, Observable, merge } = require('rxjs')
const { take, map, flatMap, observeOn, shareReplay, catchError, filter } = require('rxjs/operators')

const isFunction = obj => typeof obj === 'function'
const toString = Object.prototype.toString
const isObject = obj => toString.call(obj) === '[object Object]'
const isThenable = obj => (isObject(obj) || isFunction(obj)) && 'then' in obj
const defaultObserver = { next: noop, error: noop }

const checkValue = promise => value => {
	if (value === promise) {
		let error = new TypeError('Can not fufill promise with itself')
		return throwError(error)
	}
	if (value instanceof Promise) {
		return value[observable]
	}
	if (isThenable(value)) {
		try {
			let then = value.then
			if (isFunction(then)) {
				return new Promise(then.bind(value))[observable]
			}
		} catch (error) {
			return throwError(error)
		}
	}
	return of(value)
}

const resolvePromise = (promise, f) => {
	return Observable.create(observer => {
		let resolve = value => observer.next(value)
		let reject = reason => observer.error(reason)
		try {
			f(resolve, reject)
		} catch (error) {
			reject(error)
		}
	}).pipe(
		take(1),
		flatMap(checkValue(promise))
	)
}

const createErrorHandler = f => error => {
	return isFunction(f) ? of(f(error)) : throwError(error)
}

const createValueHandler = f => value => {
	return isFunction(f) ? f(value) : value
}

function Promise(f) {
	let subject = new Subject()
	this[observable] = subject.asObservable().pipe(
		shareReplay(1),
		observeOn(asyncScheduler)
	)
	this[observable].subscribe(defaultObserver)
	resolvePromise(this, f).subscribe(subject)
}

Promise.prototype.then = function(onFulfilled, onRejected) {
	return new Promise((resolve, reject) => {
		merge(
			this[observable].pipe(
				filter(() => false), // never feed value
				catchError(createErrorHandler(onRejected))
			),
			this[observable].pipe(map(createValueHandler(onFulfilled)))
		).subscribe({ next: resolve, error: reject })
	})
}

Promise.prototype.catch = function(onRejected) {
	return this.then(null, onRejected)
}

Promise.resolve = value => new Promise(resolve => resolve(value))
Promise.reject = reason => new Promise((_, reject) => reject(reason))

module.exports = Promise
