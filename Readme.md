
# LRUCache
[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

A simple LRUCache with maxAge and allowStale options.

<br />

## Table of Contents
- [ Installation ](#install)
- [ Usage ](#usage)

<br />

<a name="install"></a>
## Install

```console
npm i @neumatter/lru-cache
```

<br />

<a name="usage"></a>
## Usage


### `LRUCache`:

```ts
import LRUCache from '@neumatter/lru-cache'

type LRUCacheOptions = {
  maxSize?: number,
  maxAge?: number,
  allowStale?: boolean,
  sizeCalculation?: (value: any, key: any) => number,
  notFoundReturnValue?: any
}

// All Options set to default
const cache = new LRUCache({
  maxSize: 1e4,
  maxAge: Infinity,
  allowStale: false
  sizeCalculation: (value, key) => 1,
  notFoundReturnValue: undefined
})
```


### `LRUCache.get`:

```js
// All Options set to default
const value = cache.get('/key', { allowStale: false }) // returns value or cache.notFoundReturnValue
```


### `LRUCache.peek`:

Same as `LRUCache.get` but it doesn't change the order of the entries.

```js
// All Options set to default
const value = cache.peek('/key', { allowStale: false }) // returns value or cache.notFoundReturnValue
```


### `LRUCache.set`:

```js
cache.set('/key', 99)
```


### `LRUCache.clear`:

```js
cache.clear()
```


### `LRUCache.delete`:

```js
const isDeleted = cache.delete('/key') // returns boolean
```