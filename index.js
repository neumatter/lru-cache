
class LRUCacheEntry {
  constructor (key, value) {
    this.key = key
    this.value = value
    this.createdAt = Date.now()
    this.modifiedAt = this.createdAt
  }
}

/**
 *
 * @extends {Map<any, LRUCacheEntry>}
 */
export default class LRUCache extends Map {
  #maxSize
  #maxAge
  /** @type {Map<string, Set<(entry: LRUCacheEntry | Error) => void>>} */
  #listeners
  #notFoundReturnValue
  #allowStale
  /** @type {(value: any, key: any) => number} */
  #sizeCalculation
  #size = 0
  #hits = 0
  #misses = 0

  constructor (
    {
      maxSize = 1e4, // 10,000
      maxAge = Infinity,
      allowStale = false,
      sizeCalculation,
      notFoundReturnValue
    } = {
      maxSize: 1e4,
      maxAge: Infinity,
      allowStale: false
    }
  ) {
    super()
    this.#maxSize = maxSize // How many items to store in cache at max.
    this.#maxAge = maxAge
    this.#notFoundReturnValue = notFoundReturnValue
    this.#allowStale = allowStale

    if (typeof sizeCalculation !== 'function') {
      this.#sizeCalculation = (value, key) => 1
    } else {
      this.#sizeCalculation = sizeCalculation
    }

    this.#listeners = new Map([
      ['expired', new Set()],
      ['evicted', new Set()],
      ['error', new Set()]
    ])
  }

  get allowStale () {
    return this.#allowStale
  }

  get maxSize () {
    return this.#maxSize
  }

  get maxAge () {
    return this.#maxAge
  }

  get size () {
    return this.#size
  }

  get stats () {
    return {
      size: this.#size,
      hits: this.#hits,
      misses: this.#misses,
      hitRatio: this.#hits / (this.#hits + this.#misses)
    }
  }

  #emit (eventName, ...args) {
    const eventSet = this.#listeners.get(eventName)

    if (
      typeof eventSet === 'undefined' ||
      eventSet.size === 0
    ) {
      return this
    }

    for (const eventListener of eventSet.values()) {
      const potentialPromise = eventListener(...args)
      if (
        typeof potentialPromise === 'object' &&
        typeof potentialPromise.then === 'function'
      ) {
        if (eventName !== 'error') {
          potentialPromise
            .catch(err => {
              this.emit('error', err)
            })
        }
      }
    }

    return this
  }

  /**
   *
   * @param {'error' | 'expired' | 'evicted'} eventName
   * @param {(entry: LRUCacheEntry | Error) => void} callback
   */
  addListener (eventName, callback) {
    const eventSet = this.#listeners.get(eventName)

    if (typeof eventSet === 'undefined') {
      return this
    }

    if (!eventSet.has(callback)) {
      eventSet.add(callback)
      this.#listeners.set(eventName, eventSet)
    }

    return this
  }

  /**
   *
   * @param {string} eventName
   * @param {(entry: LRUCacheEntry | Error) => void} callback
   */
  removeListener (eventName, callback) {
    const eventSet = this.#listeners.get(eventName)

    if (typeof eventSet === 'undefined' || eventSet.size === 0) {
      return this
    }

    if (eventSet.has(callback)) {
      eventSet.delete(callback)
      this.#listeners.set(eventName, eventSet)
    }

    return this
  }

  clear () {
    super.clear()
    this.#size = 0
  }

  delete (key) {
    const entry = super.get(key)
    const result = super.delete(key)

    if (entry !== undefined) {
      const size = this.#sizeCalculation(entry.value, key)

      if (typeof size !== 'number') {
        throw new TypeError('sizeCalculation should return number to be added to size of cache.')
      }

      this.#size -= size
      this.#emit('evicted', entry.value)
    }

    return result
  }

  /**
   * Returns an iterable object yielding the entries in the cache.
   * In order from most recently used to least recently used.
   * @returns {IterableIterator<[any, any]>}
   */
  entries () {
    const entries = [...super.values()]
    let index = entries.length

    const res = {
      * [Symbol.iterator] () {
        while (--index >= 0) {
          const entry = entries[index]
          yield [entry.key, entry.value]
        }
      }
    }

    return res
  }

  * [Symbol.iterator] () {
    return this.entries()
  }

  /**
   * Returns the cached value by searching the cache.
   * @param {(value: any, key: any, cache: LRUCache) => any} findFunction Should return truthy value when item found.
   * @param {{ allowStale: boolean } | undefined} options
   * @returns {any}
   */
  find (findFunction, options = {}) {
    for (const entry of super.entries()) {
      const indexRes = findFunction(entry[1].value, entry[0], this)
      if (indexRes) {
        return this.get(entry[0], options)
      }
    }

    return this.#notFoundReturnValue
  }

  /**
   *
   * @param {(value: any, key: any, cache: LRUCache) => any} someFunction Should return truthy value when item found.
   * @param {{ allowStale: boolean } | undefined} options
   * @returns {boolean}
   */
  some (someFunction) {
    for (const entry of super.entries()) {
      const indexRes = someFunction(entry[1].value, entry[0], this)
      if (indexRes) {
        return true
      }
    }

    return false
  }

  /**
   *
   * @param {(value: any, key: any) => void} callback
   */
  forEach (callback) {
    super.forEach((entry, key) => {
      callback(entry.value, key)
    })
  }

  /**
   * Returns the cached value by its key.
   * Time complexity: O(1) in average.
   * @param {string} key
   * @param {{ allowStale: boolean } | undefined} options
   * @returns {any}
   */
  get (key, options = {}) {
    const entry = super.get(key)

    if (entry === undefined) {
      ++this.#misses
      return this.#notFoundReturnValue
    }

    const allowStale = typeof options.allowStale === 'boolean'
      ? options.allowStale
      : this.#allowStale

    if (!allowStale && (Date.now() - this.#maxAge) > entry.modifiedAt) {
      ++this.#misses
      this.delete(entry.key)
      this.#emit('expired', entry)
      return this.#notFoundReturnValue
    }

    ++this.#hits
    super.delete(key)
    super.set(key, entry)
    return entry.value
  }

  /**
   * Returns an iterable object yielding the keys in the cache.
   * In order from most recently used to least recently used.
   * @returns {IterableIterator<any>}
   */
  keys () {
    const keys = [...super.keys()]
    let index = keys.length

    const res = {
      * [Symbol.iterator] () {
        while (--index >= 0) {
          yield keys[index]
        }
      }
    }

    return res
  }

  /**
   * Returns the cached value by its key.
   * Does not update order of list.
   * Time complexity: O(1) in average.
   * @param {string} key
   * @param {{ allowStale: boolean } | undefined} options
   * @returns {any}
   */
  peek (key, options = {}) {
    const entry = super.get(key)

    if (entry === undefined) {
      return this.#notFoundReturnValue
    }

    const allowStale = typeof options.allowStale === 'boolean'
      ? options.allowStale
      : this.#allowStale

    if (!allowStale && (Date.now() - this.#maxAge) > entry.modifiedAt) {
      this.delete(entry.key)
      this.#emit('expired', entry)
      return this.#notFoundReturnValue
    }

    return entry.value
  }

  /**
   * Sets the value to cache by its key.
   * Time complexity: O(1).
   * @param {string} key
   * @param {any} value
   */
  set (key, value) {
    if (this.size === this.maxSize) {
      const keyIterator = super.keys()
      const { value: headKey } = keyIterator.next()
      this.delete(headKey)
    }

    if (this.has(key)) {
      const entry = super.get(key)
      entry.modifiedAt = Date.now()
      entry.value = value
      super.delete(key)
      super.set(key, entry)
    } else {
      super.set(key, new LRUCacheEntry(key, value))
      const size = Number(this.#sizeCalculation(value, key))

      if (typeof size !== 'number') {
        throw new TypeError('sizeCalculation should return number to be added to size of cache.')
      }

      this.#size += size
    }

    return this
  }

  /**
   * Returns an iterable object yielding the values in the cache.
   * In order from most recently used to least recently used.
   * @returns {IterableIterator<any>}
   */
  values () {
    const entries = [...super.values()]
    let index = entries.length

    const res = {
      * [Symbol.iterator] () {
        while (--index >= 0) {
          const entry = entries[index]
          yield entry.value
        }
      }
    }

    return res
  }
}
