
declare class LRUCacheEntry<K extends any, V extends any> {
  key: K
  value: V
  createdAt: number
  modifiedAt: number

  constructor (key: K, value: V)
}

interface ListenerMap {
  error: (err: Error) => void
  expired: (entry: LRUCacheEntry) => void
  evicted: (entry: LRUCacheEntry) => void
}

export default class LRUCache<K extends any, V extends any, U extends any> extends Map<K, LRUCacheEntry<K, V>> {
  #maxSize: number
  #maxAge: number
  #listeners: Map<string, Set<(entry: LRUCacheEntry | Error) => void>>
  #notFoundReturnValue: U
  #allowStale: boolean
  #sizeCalculation: (value: any, key: any) => number
  #size: number
  #hits: number
  #misses: number

  constructor (options?: {
    maxSize?: number,
    maxAge?: number,
    allowStale?: boolean,
    sizeCalculation?: (value: any, key: any) => number,
    notFoundReturnValue?: U
  })

  get allowStale (): boolean

  get maxSize (): boolean

  get maxAge (): boolean

  get size (): boolean

  get stats (): {
    size: number,
    hits: number,
    misses: number,
    hitRatio: number
  }

  addListener<E extends keyof ListenerMap> (eventName: E, callback: ListenerMap[E]): this

  /**
   *
   * @param {string} eventName
   * @param {(entry: LRUCacheEntry | Error) => void} callback
   */
  removeListener<E extends keyof ListenerMap> (eventName: E, callback: ListenerMap[E]): this

  clear (): void

  delete (key: K): boolean

  /**
   * Returns an iterable object yielding the entries in the cache.
   * In order from most recently used to least recently used.
   */
  entries (): IterableIterator<[K, V]>

  * [Symbol.iterator] () {
    return this.entries()
  }

  /**
   * Returns the cached value by searching the cache.
   * @param findFunction Should return truthy value when item found.
   * @param options
   */
  find (
    findFunction: (value: V, key: K, cache: LRUCache<K, V>) => any,
    options?: { allowStale?: boolean }
  ): V | U

  /**
   *
   * @param someFunction Should return truthy value when item found.
   */
  some (
    someFunction: (value: V, key: K, cache: LRUCache<K, V>) => any
  ): boolean

  forEach (callback: (value: V, key: K) => void): void

  /**
   * Returns the cached value by its key.
   * Time complexity: O(1) in average.
   */
  get (
    key: K,
    options?: { allowStale?: boolean }
  ): V | U

  /**
   * Returns an iterable object yielding the keys in the cache.
   * In order from most recently used to least recently used.
   * @returns {IterableIterator<any>}
   */
  keys (): IterableIterator<K>

  /**
   * Returns the cached value by its key.
   * Does not update order of list.
   * Time complexity: O(1) in average.
   */
  peek (
    key: K,
    options?: { allowStale?: boolean }
  ): V | U

  /**
   * Sets the value to cache by its key.
   * Time complexity: O(1).
   */
  set (key: K, value: V): this

  /**
   * Returns an iterable object yielding the values in the cache.
   * In order from most recently used to least recently used.
   * @returns {IterableIterator<any>}
   */
  values (): IterableIterator<V>
}
