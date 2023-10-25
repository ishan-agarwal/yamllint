require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeCollection = composeCollection;

var _Node = require("../nodes/Node.js");

var _Scalar = require("../nodes/Scalar.js");

var _resolveBlockMap = require("./resolve-block-map.js");

var _resolveBlockSeq = require("./resolve-block-seq.js");

var _resolveFlowCollection = require("./resolve-flow-collection.js");

function composeCollection(CN, ctx, token, tagToken, onError) {
  var _tag;

  var coll;

  switch (token.type) {
    case 'block-map':
      {
        coll = (0, _resolveBlockMap.resolveBlockMap)(CN, ctx, token, onError);
        break;
      }

    case 'block-seq':
      {
        coll = (0, _resolveBlockSeq.resolveBlockSeq)(CN, ctx, token, onError);
        break;
      }

    case 'flow-collection':
      {
        coll = (0, _resolveFlowCollection.resolveFlowCollection)(CN, ctx, token, onError);
        break;
      }
  }

  if (!tagToken) return coll;
  var tagName = ctx.directives.tagName(tagToken.source, function (msg) {
    return onError(tagToken, 'TAG_RESOLVE_FAILED', msg);
  });
  if (!tagName) return coll; // Cast needed due to: https://github.com/Microsoft/TypeScript/issues/3841

  var Coll = coll.constructor;

  if (tagName === '!' || tagName === Coll.tagName) {
    coll.tag = Coll.tagName;
    return coll;
  }

  var expType = (0, _Node.isMap)(coll) ? 'map' : 'seq';
  var tag = ctx.schema.tags.find(function (t) {
    return t.collection === expType && t.tag === tagName;
  });

  if (!tag) {
    var kt = ctx.schema.knownTags[tagName];

    if (kt && kt.collection === expType) {
      ctx.schema.tags.push(Object.assign({}, kt, {
        "default": false
      }));
      tag = kt;
    } else {
      onError(tagToken, 'TAG_RESOLVE_FAILED', "Unresolved tag: ".concat(tagName), true);
      coll.tag = tagName;
      return coll;
    }
  }

  var res = tag.resolve(coll, function (msg) {
    return onError(tagToken, 'TAG_RESOLVE_FAILED', msg);
  }, ctx.options);
  var node = (0, _Node.isNode)(res) ? res : new _Scalar.Scalar(res);
  node.range = coll.range;
  node.tag = tagName;
  if ((_tag = tag) !== null && _tag !== void 0 && _tag.format) node.format = tag.format;
  return node;
}

},{"../nodes/Node.js":31,"../nodes/Scalar.js":33,"./resolve-block-map.js":10,"./resolve-block-seq.js":12,"./resolve-flow-collection.js":14}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeDoc = composeDoc;

var _Document = require("../doc/Document.js");

var _composeNode = require("./compose-node.js");

var _resolveEnd = require("./resolve-end.js");

var _resolveProps = require("./resolve-props.js");

function composeDoc(options, directives, _ref, onError) {
  var offset = _ref.offset,
      start = _ref.start,
      value = _ref.value,
      end = _ref.end;
  var opts = Object.assign({
    _directives: directives
  }, options);
  var doc = new _Document.Document(undefined, opts);
  var ctx = {
    atRoot: true,
    directives: doc.directives,
    options: doc.options,
    schema: doc.schema
  };
  var props = (0, _resolveProps.resolveProps)(start, {
    indicator: 'doc-start',
    next: value !== null && value !== void 0 ? value : end === null || end === void 0 ? void 0 : end[0],
    offset: offset,
    onError: onError,
    startOnNewline: true
  });

  if (props.found) {
    doc.directives.docStart = true;
    if (value && (value.type === 'block-map' || value.type === 'block-seq') && !props.hasNewline) onError(props.end, 'MISSING_CHAR', 'Block collection cannot start on same line with directives-end marker');
  }

  doc.contents = value ? (0, _composeNode.composeNode)(ctx, value, props, onError) : (0, _composeNode.composeEmptyNode)(ctx, props.end, start, null, props, onError);
  var contentEnd = doc.contents.range[2];
  var re = (0, _resolveEnd.resolveEnd)(end, contentEnd, false, onError);
  if (re.comment) doc.comment = re.comment;
  doc.range = [offset, contentEnd, re.offset];
  return doc;
}

},{"../doc/Document.js":21,"./compose-node.js":7,"./resolve-end.js":13,"./resolve-props.js":16}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeEmptyNode = composeEmptyNode;
exports.composeNode = composeNode;

var _Alias = require("../nodes/Alias.js");

var _composeCollection = require("./compose-collection.js");

var _composeScalar = require("./compose-scalar.js");

var _resolveEnd = require("./resolve-end.js");

var _utilEmptyScalarPosition = require("./util-empty-scalar-position.js");

var CN = {
  composeNode: composeNode,
  composeEmptyNode: composeEmptyNode
};

function composeNode(ctx, token, props, onError) {
  var spaceBefore = props.spaceBefore,
      comment = props.comment,
      anchor = props.anchor,
      tag = props.tag;
  var node;
  var isSrcToken = true;

  switch (token.type) {
    case 'alias':
      node = composeAlias(ctx, token, onError);
      if (anchor || tag) onError(token, 'ALIAS_PROPS', 'An alias node must not specify any properties');
      break;

    case 'scalar':
    case 'single-quoted-scalar':
    case 'double-quoted-scalar':
    case 'block-scalar':
      node = (0, _composeScalar.composeScalar)(ctx, token, tag, onError);
      if (anchor) node.anchor = anchor.source.substring(1);
      break;

    case 'block-map':
    case 'block-seq':
    case 'flow-collection':
      node = (0, _composeCollection.composeCollection)(CN, ctx, token, tag, onError);
      if (anchor) node.anchor = anchor.source.substring(1);
      break;

    default:
      {
        var message = token.type === 'error' ? token.message : "Unsupported token (type: ".concat(token.type, ")");
        onError(token, 'UNEXPECTED_TOKEN', message);
        node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError);
        isSrcToken = false;
      }
  }

  if (anchor && node.anchor === '') onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
  if (spaceBefore) node.spaceBefore = true;

  if (comment) {
    if (token.type === 'scalar' && token.source === '') node.comment = comment;else node.commentBefore = comment;
  } // @ts-expect-error Type checking misses meaning of isSrcToken


  if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
  return node;
}

function composeEmptyNode(ctx, offset, before, pos, _ref, onError) {
  var spaceBefore = _ref.spaceBefore,
      comment = _ref.comment,
      anchor = _ref.anchor,
      tag = _ref.tag,
      end = _ref.end;
  var token = {
    type: 'scalar',
    offset: (0, _utilEmptyScalarPosition.emptyScalarPosition)(offset, before, pos),
    indent: -1,
    source: ''
  };
  var node = (0, _composeScalar.composeScalar)(ctx, token, tag, onError);

  if (anchor) {
    node.anchor = anchor.source.substring(1);
    if (node.anchor === '') onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
  }

  if (spaceBefore) node.spaceBefore = true;

  if (comment) {
    node.comment = comment;
    node.range[2] = end;
  }

  return node;
}

function composeAlias(_ref2, _ref3, onError) {
  var options = _ref2.options;
  var offset = _ref3.offset,
      source = _ref3.source,
      end = _ref3.end;
  var alias = new _Alias.Alias(source.substring(1));
  if (alias.source === '') onError(offset, 'BAD_ALIAS', 'Alias cannot be an empty string');
  if (alias.source.endsWith(':')) onError(offset + source.length - 1, 'BAD_ALIAS', 'Alias ending in : is ambiguous', true);
  var valueEnd = offset + source.length;
  var re = (0, _resolveEnd.resolveEnd)(end, valueEnd, options.strict, onError);
  alias.range = [offset, valueEnd, re.offset];
  if (re.comment) alias.comment = re.comment;
  return alias;
}

},{"../nodes/Alias.js":29,"./compose-collection.js":5,"./compose-scalar.js":8,"./resolve-end.js":13,"./util-empty-scalar-position.js":18}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeScalar = composeScalar;

var _Node = require("../nodes/Node.js");

var _Scalar = require("../nodes/Scalar.js");

var _resolveBlockScalar = require("./resolve-block-scalar.js");

var _resolveFlowScalar = require("./resolve-flow-scalar.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function composeScalar(ctx, token, tagToken, onError) {
  var _ref = token.type === 'block-scalar' ? (0, _resolveBlockScalar.resolveBlockScalar)(token, ctx.options.strict, onError) : (0, _resolveFlowScalar.resolveFlowScalar)(token, ctx.options.strict, onError),
      value = _ref.value,
      type = _ref.type,
      comment = _ref.comment,
      range = _ref.range;

  var tagName = tagToken ? ctx.directives.tagName(tagToken.source, function (msg) {
    return onError(tagToken, 'TAG_RESOLVE_FAILED', msg);
  }) : null;
  var tag = tagToken && tagName ? findScalarTagByName(ctx.schema, value, tagName, tagToken, onError) : token.type === 'scalar' ? findScalarTagByTest(ctx, value, token, onError) : ctx.schema[_Node.SCALAR];
  var scalar;

  try {
    var res = tag.resolve(value, function (msg) {
      return onError(tagToken !== null && tagToken !== void 0 ? tagToken : token, 'TAG_RESOLVE_FAILED', msg);
    }, ctx.options);
    scalar = (0, _Node.isScalar)(res) ? res : new _Scalar.Scalar(res);
  } catch (error) {
    var msg = error instanceof Error ? error.message : String(error);
    onError(tagToken !== null && tagToken !== void 0 ? tagToken : token, 'TAG_RESOLVE_FAILED', msg);
    scalar = new _Scalar.Scalar(value);
  }

  scalar.range = range;
  scalar.source = value;
  if (type) scalar.type = type;
  if (tagName) scalar.tag = tagName;
  if (tag.format) scalar.format = tag.format;
  if (comment) scalar.comment = comment;
  return scalar;
}

function findScalarTagByName(schema, value, tagName, tagToken, onError) {
  if (tagName === '!') return schema[_Node.SCALAR]; // non-specific tag

  var matchWithTest = [];

  var _iterator = _createForOfIteratorHelper(schema.tags),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _tag = _step.value;

      if (!_tag.collection && _tag.tag === tagName) {
        if (_tag["default"] && _tag.test) matchWithTest.push(_tag);else return _tag;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  for (var _i = 0, _matchWithTest = matchWithTest; _i < _matchWithTest.length; _i++) {
    var _tag$test;

    var tag = _matchWithTest[_i];
    if ((_tag$test = tag.test) !== null && _tag$test !== void 0 && _tag$test.test(value)) return tag;
  }

  var kt = schema.knownTags[tagName];

  if (kt && !kt.collection) {
    // Ensure that the known tag is available for stringifying,
    // but does not get used by default.
    schema.tags.push(Object.assign({}, kt, {
      "default": false,
      test: undefined
    }));
    return kt;
  }

  onError(tagToken, 'TAG_RESOLVE_FAILED', "Unresolved tag: ".concat(tagName), tagName !== 'tag:yaml.org,2002:str');
  return schema[_Node.SCALAR];
}

function findScalarTagByTest(_ref2, value, token, onError) {
  var directives = _ref2.directives,
      schema = _ref2.schema;

  var tag = schema.tags.find(function (tag) {
    var _tag$test2;

    return tag["default"] && ((_tag$test2 = tag.test) === null || _tag$test2 === void 0 ? void 0 : _tag$test2.test(value));
  }) || schema[_Node.SCALAR];

  if (schema.compat) {
    var _schema$compat$find;

    var compat = (_schema$compat$find = schema.compat.find(function (tag) {
      var _tag$test3;

      return tag["default"] && ((_tag$test3 = tag.test) === null || _tag$test3 === void 0 ? void 0 : _tag$test3.test(value));
    })) !== null && _schema$compat$find !== void 0 ? _schema$compat$find : schema[_Node.SCALAR];

    if (tag.tag !== compat.tag) {
      var ts = directives.tagString(tag.tag);
      var cs = directives.tagString(compat.tag);
      var msg = "Value may be parsed as either ".concat(ts, " or ").concat(cs);
      onError(token, 'TAG_RESOLVE_FAILED', msg, true);
    }
  }

  return tag;
}

},{"../nodes/Node.js":31,"../nodes/Scalar.js":33,"./resolve-block-scalar.js":11,"./resolve-flow-scalar.js":15}],9:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Composer = void 0;

var _directives = require("../doc/directives.js");

var _Document = require("../doc/Document.js");

var _errors = require("../errors.js");

var _Node = require("../nodes/Node.js");

var _composeDoc = require("./compose-doc.js");

var _resolveEnd = require("./resolve-end.js");

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function getErrorPos(src) {
  if (typeof src === 'number') return [src, src + 1];
  if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
  var offset = src.offset,
      source = src.source;
  return [offset, offset + (typeof source === 'string' ? source.length : 1)];
}

function parsePrelude(prelude) {
  var _prelude;

  var comment = '';
  var atComment = false;
  var afterEmptyLine = false;

  for (var i = 0; i < prelude.length; ++i) {
    var source = prelude[i];

    switch (source[0]) {
      case '#':
        comment += (comment === '' ? '' : afterEmptyLine ? '\n\n' : '\n') + (source.substring(1) || ' ');
        atComment = true;
        afterEmptyLine = false;
        break;

      case '%':
        if (((_prelude = prelude[i + 1]) === null || _prelude === void 0 ? void 0 : _prelude[0]) !== '#') i += 1;
        atComment = false;
        break;

      default:
        // This may be wrong after doc-end, but in that case it doesn't matter
        if (!atComment) afterEmptyLine = true;
        atComment = false;
    }
  }

  return {
    comment: comment,
    afterEmptyLine: afterEmptyLine
  };
}
/**
 * Compose a stream of CST nodes into a stream of YAML Documents.
 *
 * ```ts
 * import { Composer, Parser } from 'yaml'
 *
 * const src: string = ...
 * const tokens = new Parser().parse(src)
 * const docs = new Composer().compose(tokens)
 * ```
 */


var Composer = /*#__PURE__*/function () {
  function Composer() {
    var _this = this;

    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Composer);

    this.doc = null;
    this.atDirectives = false;
    this.prelude = [];
    this.errors = [];
    this.warnings = [];

    this.onError = function (source, code, message, warning) {
      var pos = getErrorPos(source);
      if (warning) _this.warnings.push(new _errors.YAMLWarning(pos, code, message));else _this.errors.push(new _errors.YAMLParseError(pos, code, message));
    }; // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing


    this.directives = new _directives.Directives({
      version: options.version || '1.2'
    });
    this.options = options;
  }

  _createClass(Composer, [{
    key: "decorate",
    value: function decorate(doc, afterDoc) {
      var _parsePrelude = parsePrelude(this.prelude),
          comment = _parsePrelude.comment,
          afterEmptyLine = _parsePrelude.afterEmptyLine; //console.log({ dc: doc.comment, prelude, comment })


      if (comment) {
        var dc = doc.contents;

        if (afterDoc) {
          doc.comment = doc.comment ? "".concat(doc.comment, "\n").concat(comment) : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if ((0, _Node.isCollection)(dc) && !dc.flow && dc.items.length > 0) {
          var it = dc.items[0];
          if ((0, _Node.isPair)(it)) it = it.key;
          var cb = it.commentBefore;
          it.commentBefore = cb ? "".concat(comment, "\n").concat(cb) : comment;
        } else {
          var _cb = dc.commentBefore;
          dc.commentBefore = _cb ? "".concat(comment, "\n").concat(_cb) : comment;
        }
      }

      if (afterDoc) {
        Array.prototype.push.apply(doc.errors, this.errors);
        Array.prototype.push.apply(doc.warnings, this.warnings);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }

      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    /**
     * Current stream status information.
     *
     * Mostly useful at the end of input for an empty stream.
     */

  }, {
    key: "streamInfo",
    value: function streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    /**
     * Compose tokens into documents.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */

  }, {
    key: "compose",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function compose(tokens) {
      var forceDoc,
          endOffset,
          _iterator,
          _step,
          token,
          _args = arguments;

      return _regeneratorRuntime().wrap(function compose$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              forceDoc = _args.length > 1 && _args[1] !== undefined ? _args[1] : false;
              endOffset = _args.length > 2 && _args[2] !== undefined ? _args[2] : -1;
              _iterator = _createForOfIteratorHelper(tokens);
              _context.prev = 3;

              _iterator.s();

            case 5:
              if ((_step = _iterator.n()).done) {
                _context.next = 10;
                break;
              }

              token = _step.value;
              return _context.delegateYield(this.next(token), "t0", 8);

            case 8:
              _context.next = 5;
              break;

            case 10:
              _context.next = 15;
              break;

            case 12:
              _context.prev = 12;
              _context.t1 = _context["catch"](3);

              _iterator.e(_context.t1);

            case 15:
              _context.prev = 15;

              _iterator.f();

              return _context.finish(15);

            case 18:
              return _context.delegateYield(this.end(forceDoc, endOffset), "t2", 19);

            case 19:
            case "end":
              return _context.stop();
          }
        }
      }, compose, this, [[3, 12, 15, 18]]);
    })
    /** Advance the composer by one CST token. */

  }, {
    key: "next",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function next(token) {
      var _this2 = this;

      var doc, msg, error, _msg, end, dc;

      return _regeneratorRuntime().wrap(function next$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.t0 = token.type;
              _context2.next = _context2.t0 === 'directive' ? 3 : _context2.t0 === 'document' ? 7 : _context2.t0 === 'byte-order-mark' ? 16 : _context2.t0 === 'space' ? 16 : _context2.t0 === 'comment' ? 17 : _context2.t0 === 'newline' ? 17 : _context2.t0 === 'error' ? 19 : _context2.t0 === 'doc-end' ? 23 : 33;
              break;

            case 3:
              this.directives.add(token.source, function (offset, message, warning) {
                var pos = getErrorPos(token);
                pos[0] += offset;

                _this2.onError(pos, 'BAD_DIRECTIVE', message, warning);
              });
              this.prelude.push(token.source);
              this.atDirectives = true;
              return _context2.abrupt("break", 34);

            case 7:
              doc = (0, _composeDoc.composeDoc)(this.options, this.directives, token, this.onError);
              if (this.atDirectives && !doc.directives.docStart) this.onError(token, 'MISSING_CHAR', 'Missing directives-end/doc-start indicator line');
              this.decorate(doc, false);

              if (!this.doc) {
                _context2.next = 13;
                break;
              }

              _context2.next = 13;
              return this.doc;

            case 13:
              this.doc = doc;
              this.atDirectives = false;
              return _context2.abrupt("break", 34);

            case 16:
              return _context2.abrupt("break", 34);

            case 17:
              this.prelude.push(token.source);
              return _context2.abrupt("break", 34);

            case 19:
              msg = token.source ? "".concat(token.message, ": ").concat(JSON.stringify(token.source)) : token.message;
              error = new _errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', msg);
              if (this.atDirectives || !this.doc) this.errors.push(error);else this.doc.errors.push(error);
              return _context2.abrupt("break", 34);

            case 23:
              if (this.doc) {
                _context2.next = 27;
                break;
              }

              _msg = 'Unexpected doc-end without preceding document';
              this.errors.push(new _errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', _msg));
              return _context2.abrupt("break", 34);

            case 27:
              this.doc.directives.docEnd = true;
              end = (0, _resolveEnd.resolveEnd)(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
              this.decorate(this.doc, true);

              if (end.comment) {
                dc = this.doc.comment;
                this.doc.comment = dc ? "".concat(dc, "\n").concat(end.comment) : end.comment;
              }

              this.doc.range[2] = end.offset;
              return _context2.abrupt("break", 34);

            case 33:
              this.errors.push(new _errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', "Unsupported token ".concat(token.type)));

            case 34:
            case "end":
              return _context2.stop();
          }
        }
      }, next, this);
    })
    /**
     * Call at end of input to yield any remaining document.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */

  }, {
    key: "end",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function end() {
      var forceDoc,
          endOffset,
          opts,
          doc,
          _args3 = arguments;
      return _regeneratorRuntime().wrap(function end$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              forceDoc = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : false;
              endOffset = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : -1;

              if (!this.doc) {
                _context3.next = 9;
                break;
              }

              this.decorate(this.doc, true);
              _context3.next = 6;
              return this.doc;

            case 6:
              this.doc = null;
              _context3.next = 17;
              break;

            case 9:
              if (!forceDoc) {
                _context3.next = 17;
                break;
              }

              opts = Object.assign({
                _directives: this.directives
              }, this.options);
              doc = new _Document.Document(undefined, opts);
              if (this.atDirectives) this.onError(endOffset, 'MISSING_CHAR', 'Missing directives-end indicator line');
              doc.range = [0, endOffset, endOffset];
              this.decorate(doc, false);
              _context3.next = 17;
              return doc;

            case 17:
            case "end":
              return _context3.stop();
          }
        }
      }, end, this);
    })
  }]);

  return Composer;
}();

exports.Composer = Composer;

},{"../doc/Document.js":21,"../doc/directives.js":25,"../errors.js":26,"../nodes/Node.js":31,"./compose-doc.js":6,"./resolve-end.js":13}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveBlockMap = resolveBlockMap;

var _Pair = require("../nodes/Pair.js");

var _YAMLMap = require("../nodes/YAMLMap.js");

var _resolveProps = require("./resolve-props.js");

var _utilContainsNewline = require("./util-contains-newline.js");

var _utilFlowIndentCheck = require("./util-flow-indent-check.js");

var _utilMapIncludes = require("./util-map-includes.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var startColMsg = 'All mapping items must start at the same column';

function resolveBlockMap(_ref, ctx, bm, onError) {
  var _commentEnd;

  var composeNode = _ref.composeNode,
      composeEmptyNode = _ref.composeEmptyNode;
  var map = new _YAMLMap.YAMLMap(ctx.schema);
  if (ctx.atRoot) ctx.atRoot = false;
  var offset = bm.offset;
  var commentEnd = null;

  var _iterator = _createForOfIteratorHelper(bm.items),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _keyProps$found;

      var collItem = _step.value;
      var start = collItem.start,
          key = collItem.key,
          sep = collItem.sep,
          value = collItem.value; // key properties

      var keyProps = (0, _resolveProps.resolveProps)(start, {
        indicator: 'explicit-key-ind',
        next: key !== null && key !== void 0 ? key : sep === null || sep === void 0 ? void 0 : sep[0],
        offset: offset,
        onError: onError,
        startOnNewline: true
      });
      var implicitKey = !keyProps.found;

      if (implicitKey) {
        if (key) {
          if (key.type === 'block-seq') onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'A block sequence may not be used as an implicit map key');else if ('indent' in key && key.indent !== bm.indent) onError(offset, 'BAD_INDENT', startColMsg);
        }

        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;

          if (keyProps.comment) {
            if (map.comment) map.comment += '\n' + keyProps.comment;else map.comment = keyProps.comment;
          }

          continue;
        }

        if (keyProps.hasNewlineAfterProp || (0, _utilContainsNewline.containsNewline)(key)) {
          onError(key !== null && key !== void 0 ? key : start[start.length - 1], 'MULTILINE_IMPLICIT_KEY', 'Implicit keys need to be on a single line');
        }
      } else if (((_keyProps$found = keyProps.found) === null || _keyProps$found === void 0 ? void 0 : _keyProps$found.indent) !== bm.indent) {
        onError(offset, 'BAD_INDENT', startColMsg);
      } // key value


      var keyStart = keyProps.end;
      var keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat) (0, _utilFlowIndentCheck.flowIndentCheck)(bm.indent, key, onError);
      if ((0, _utilMapIncludes.mapIncludes)(ctx, map.items, keyNode)) onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique'); // value properties

      var valueProps = (0, _resolveProps.resolveProps)(sep !== null && sep !== void 0 ? sep : [], {
        indicator: 'map-value-ind',
        next: value,
        offset: keyNode.range[2],
        onError: onError,
        startOnNewline: !key || key.type === 'block-scalar'
      });
      offset = valueProps.end;

      if (valueProps.found) {
        if (implicitKey) {
          if ((value === null || value === void 0 ? void 0 : value.type) === 'block-map' && !valueProps.hasNewline) onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'Nested mappings are not allowed in compact mappings');
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024) onError(keyNode.range, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit block mapping key');
        } // value value


        var valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat) (0, _utilFlowIndentCheck.flowIndentCheck)(bm.indent, value, onError);
        offset = valueNode.range[2];
        var pair = new _Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        // key with no value
        if (implicitKey) onError(keyNode.range, 'MISSING_CHAR', 'Implicit map keys need to be followed by map values');

        if (valueProps.comment) {
          if (keyNode.comment) keyNode.comment += '\n' + valueProps.comment;else keyNode.comment = valueProps.comment;
        }

        var _pair = new _Pair.Pair(keyNode);

        if (ctx.options.keepSourceTokens) _pair.srcToken = collItem;
        map.items.push(_pair);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (commentEnd && commentEnd < offset) onError(commentEnd, 'IMPOSSIBLE', 'Map comment with trailing content');
  map.range = [bm.offset, offset, (_commentEnd = commentEnd) !== null && _commentEnd !== void 0 ? _commentEnd : offset];
  return map;
}

},{"../nodes/Pair.js":32,"../nodes/YAMLMap.js":34,"./resolve-props.js":16,"./util-contains-newline.js":17,"./util-flow-indent-check.js":19,"./util-map-includes.js":20}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveBlockScalar = resolveBlockScalar;

var _Scalar = require("../nodes/Scalar.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function resolveBlockScalar(scalar, strict, onError) {
  var start = scalar.offset;
  var header = parseBlockScalarHeader(scalar, strict, onError);
  if (!header) return {
    value: '',
    type: null,
    comment: '',
    range: [start, start, start]
  };
  var type = header.mode === '>' ? _Scalar.Scalar.BLOCK_FOLDED : _Scalar.Scalar.BLOCK_LITERAL;
  var lines = scalar.source ? splitLines(scalar.source) : []; // determine the end of content & start of chomping

  var chompStart = lines.length;

  for (var i = lines.length - 1; i >= 0; --i) {
    var content = lines[i][1];
    if (content === '' || content === '\r') chompStart = i;else break;
  } // shortcut for empty contents


  if (chompStart === 0) {
    var _value = header.chomp === '+' && lines.length > 0 ? '\n'.repeat(Math.max(1, lines.length - 1)) : '';

    var _end = start + header.length;

    if (scalar.source) _end += scalar.source.length;
    return {
      value: _value,
      type: type,
      comment: header.comment,
      range: [start, _end, _end]
    };
  } // find the indentation level to trim from start


  var trimIndent = scalar.indent + header.indent;
  var offset = scalar.offset + header.length;
  var contentStart = 0;

  for (var _i = 0; _i < chompStart; ++_i) {
    var _lines$_i = _slicedToArray(lines[_i], 2),
        indent = _lines$_i[0],
        _content = _lines$_i[1];

    if (_content === '' || _content === '\r') {
      if (header.indent === 0 && indent.length > trimIndent) trimIndent = indent.length;
    } else {
      if (indent.length < trimIndent) {
        var message = 'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
        onError(offset + indent.length, 'MISSING_CHAR', message);
      }

      if (header.indent === 0) trimIndent = indent.length;
      contentStart = _i;
      break;
    }

    offset += indent.length + _content.length + 1;
  } // include trailing more-indented empty lines in content


  for (var _i2 = lines.length - 1; _i2 >= chompStart; --_i2) {
    if (lines[_i2][0].length > trimIndent) chompStart = _i2 + 1;
  }

  var value = '';
  var sep = '';
  var prevMoreIndented = false; // leading whitespace is kept intact

  for (var _i3 = 0; _i3 < contentStart; ++_i3) {
    value += lines[_i3][0].slice(trimIndent) + '\n';
  }

  for (var _i4 = contentStart; _i4 < chompStart; ++_i4) {
    var _lines$_i2 = _slicedToArray(lines[_i4], 2),
        _indent = _lines$_i2[0],
        _content2 = _lines$_i2[1];

    offset += _indent.length + _content2.length + 1;
    var crlf = _content2[_content2.length - 1] === '\r';
    if (crlf) _content2 = _content2.slice(0, -1);
    /* istanbul ignore if already caught in lexer */

    if (_content2 && _indent.length < trimIndent) {
      var src = header.indent ? 'explicit indentation indicator' : 'first line';

      var _message = "Block scalar lines must not be less indented than their ".concat(src);

      onError(offset - _content2.length - (crlf ? 2 : 1), 'BAD_INDENT', _message);
      _indent = '';
    }

    if (type === _Scalar.Scalar.BLOCK_LITERAL) {
      value += sep + _indent.slice(trimIndent) + _content2;
      sep = '\n';
    } else if (_indent.length > trimIndent || _content2[0] === '\t') {
      // more-indented content within a folded block
      if (sep === ' ') sep = '\n';else if (!prevMoreIndented && sep === '\n') sep = '\n\n';
      value += sep + _indent.slice(trimIndent) + _content2;
      sep = '\n';
      prevMoreIndented = true;
    } else if (_content2 === '') {
      // empty line
      if (sep === '\n') value += '\n';else sep = '\n';
    } else {
      value += sep + _content2;
      sep = ' ';
      prevMoreIndented = false;
    }
  }

  switch (header.chomp) {
    case '-':
      break;

    case '+':
      for (var _i5 = chompStart; _i5 < lines.length; ++_i5) {
        value += '\n' + lines[_i5][0].slice(trimIndent);
      }

      if (value[value.length - 1] !== '\n') value += '\n';
      break;

    default:
      value += '\n';
  }

  var end = start + header.length + scalar.source.length;
  return {
    value: value,
    type: type,
    comment: header.comment,
    range: [start, end, end]
  };
}

function parseBlockScalarHeader(_ref, strict, onError) {
  var offset = _ref.offset,
      props = _ref.props;

  /* istanbul ignore if should not happen */
  if (props[0].type !== 'block-scalar-header') {
    onError(props[0], 'IMPOSSIBLE', 'Block scalar header not found');
    return null;
  }

  var source = props[0].source;
  var mode = source[0];
  var indent = 0;
  var chomp = '';
  var error = -1;

  for (var i = 1; i < source.length; ++i) {
    var ch = source[i];
    if (!chomp && (ch === '-' || ch === '+')) chomp = ch;else {
      var n = Number(ch);
      if (!indent && n) indent = n;else if (error === -1) error = offset + i;
    }
  }

  if (error !== -1) onError(error, 'UNEXPECTED_TOKEN', "Block scalar header includes extra characters: ".concat(source));
  var hasSpace = false;
  var comment = '';
  var length = source.length;

  for (var _i6 = 1; _i6 < props.length; ++_i6) {
    var token = props[_i6];

    switch (token.type) {
      case 'space':
        hasSpace = true;
      // fallthrough

      case 'newline':
        length += token.source.length;
        break;

      case 'comment':
        if (strict && !hasSpace) {
          var message = 'Comments must be separated from other tokens by white space characters';
          onError(token, 'MISSING_CHAR', message);
        }

        length += token.source.length;
        comment = token.source.substring(1);
        break;

      case 'error':
        onError(token, 'UNEXPECTED_TOKEN', token.message);
        length += token.source.length;
        break;

      /* istanbul ignore next should not happen */

      default:
        {
          var _message2 = "Unexpected token in block scalar header: ".concat(token.type);

          onError(token, 'UNEXPECTED_TOKEN', _message2);
          var ts = token.source;
          if (ts && typeof ts === 'string') length += ts.length;
        }
    }
  }

  return {
    mode: mode,
    indent: indent,
    chomp: chomp,
    comment: comment,
    length: length
  };
}
/** @returns Array of lines split up as `[indent, content]` */


function splitLines(source) {
  var split = source.split(/\n( *)/);
  var first = split[0];
  var m = first.match(/^( *)/);
  var line0 = m !== null && m !== void 0 && m[1] ? [m[1], first.slice(m[1].length)] : ['', first];
  var lines = [line0];

  for (var i = 1; i < split.length; i += 2) {
    lines.push([split[i], split[i + 1]]);
  }

  return lines;
}

},{"../nodes/Scalar.js":33}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveBlockSeq = resolveBlockSeq;

var _YAMLSeq = require("../nodes/YAMLSeq.js");

var _resolveProps = require("./resolve-props.js");

var _utilFlowIndentCheck = require("./util-flow-indent-check.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function resolveBlockSeq(_ref, ctx, bs, onError) {
  var _commentEnd;

  var composeNode = _ref.composeNode,
      composeEmptyNode = _ref.composeEmptyNode;
  var seq = new _YAMLSeq.YAMLSeq(ctx.schema);
  if (ctx.atRoot) ctx.atRoot = false;
  var offset = bs.offset;
  var commentEnd = null;

  var _iterator = _createForOfIteratorHelper(bs.items),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
          start = _step$value.start,
          value = _step$value.value;
      var props = (0, _resolveProps.resolveProps)(start, {
        indicator: 'seq-item-ind',
        next: value,
        offset: offset,
        onError: onError,
        startOnNewline: true
      });

      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value && value.type === 'block-seq') onError(props.end, 'BAD_INDENT', 'All sequence items must start at the same column');else onError(offset, 'MISSING_CHAR', 'Sequence item without - indicator');
        } else {
          commentEnd = props.end;
          if (props.comment) seq.comment = props.comment;
          continue;
        }
      }

      var node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat) (0, _utilFlowIndentCheck.flowIndentCheck)(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  seq.range = [bs.offset, offset, (_commentEnd = commentEnd) !== null && _commentEnd !== void 0 ? _commentEnd : offset];
  return seq;
}

},{"../nodes/YAMLSeq.js":35,"./resolve-props.js":16,"./util-flow-indent-check.js":19}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveEnd = resolveEnd;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function resolveEnd(end, offset, reqSpace, onError) {
  var comment = '';

  if (end) {
    var hasSpace = false;
    var sep = '';

    var _iterator = _createForOfIteratorHelper(end),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var token = _step.value;
        var source = token.source,
            type = token.type;

        switch (type) {
          case 'space':
            hasSpace = true;
            break;

          case 'comment':
            {
              if (reqSpace && !hasSpace) onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
              var cb = source.substring(1) || ' ';
              if (!comment) comment = cb;else comment += sep + cb;
              sep = '';
              break;
            }

          case 'newline':
            if (comment) sep += source;
            hasSpace = true;
            break;

          default:
            onError(token, 'UNEXPECTED_TOKEN', "Unexpected ".concat(type, " at node end"));
        }

        offset += source.length;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return {
    comment: comment,
    offset: offset
  };
}

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveFlowCollection = resolveFlowCollection;

var _Node = require("../nodes/Node.js");

var _Pair = require("../nodes/Pair.js");

var _YAMLMap = require("../nodes/YAMLMap.js");

var _YAMLSeq = require("../nodes/YAMLSeq.js");

var _resolveEnd = require("./resolve-end.js");

var _resolveProps = require("./resolve-props.js");

var _utilContainsNewline = require("./util-contains-newline.js");

var _utilMapIncludes = require("./util-map-includes.js");

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var blockMsg = 'Block collections are not allowed within flow collections';

var isBlock = function isBlock(token) {
  return token && (token.type === 'block-map' || token.type === 'block-seq');
};

function resolveFlowCollection(_ref, ctx, fc, onError) {
  var composeNode = _ref.composeNode,
      composeEmptyNode = _ref.composeEmptyNode;
  var isMap = fc.start.source === '{';
  var fcName = isMap ? 'flow map' : 'flow sequence';
  var coll = isMap ? new _YAMLMap.YAMLMap(ctx.schema) : new _YAMLSeq.YAMLSeq(ctx.schema);
  coll.flow = true;
  var atRoot = ctx.atRoot;
  if (atRoot) ctx.atRoot = false;
  var offset = fc.offset + fc.start.source.length;

  for (var i = 0; i < fc.items.length; ++i) {
    var collItem = fc.items[i];
    var start = collItem.start,
        key = collItem.key,
        sep = collItem.sep,
        value = collItem.value;
    var props = (0, _resolveProps.resolveProps)(start, {
      flow: fcName,
      indicator: 'explicit-key-ind',
      next: key !== null && key !== void 0 ? key : sep === null || sep === void 0 ? void 0 : sep[0],
      offset: offset,
      onError: onError,
      startOnNewline: false
    });

    if (!props.found) {
      if (!props.anchor && !props.tag && !sep && !value) {
        if (i === 0 && props.comma) onError(props.comma, 'UNEXPECTED_TOKEN', "Unexpected , in ".concat(fcName));else if (i < fc.items.length - 1) onError(props.start, 'UNEXPECTED_TOKEN', "Unexpected empty item in ".concat(fcName));

        if (props.comment) {
          if (coll.comment) coll.comment += '\n' + props.comment;else coll.comment = props.comment;
        }

        offset = props.end;
        continue;
      }

      if (!isMap && ctx.options.strict && (0, _utilContainsNewline.containsNewline)(key)) onError(key, // checked by containsNewline()
      'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
    }

    if (i === 0) {
      if (props.comma) onError(props.comma, 'UNEXPECTED_TOKEN', "Unexpected , in ".concat(fcName));
    } else {
      if (!props.comma) onError(props.start, 'MISSING_CHAR', "Missing , between ".concat(fcName, " items"));

      if (props.comment) {
        var prevItemComment = '';

        var _iterator = _createForOfIteratorHelper(start),
            _step;

        try {
          loop: for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var st = _step.value;

            switch (st.type) {
              case 'comma':
              case 'space':
                break;

              case 'comment':
                prevItemComment = st.source.substring(1);
                break loop;

              default:
                break loop;
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        if (prevItemComment) {
          var _prev$value;

          var prev = coll.items[coll.items.length - 1];
          if ((0, _Node.isPair)(prev)) prev = (_prev$value = prev.value) !== null && _prev$value !== void 0 ? _prev$value : prev.key;
          if (prev.comment) prev.comment += '\n' + prevItemComment;else prev.comment = prevItemComment;
          props.comment = props.comment.substring(prevItemComment.length + 1);
        }
      }
    }

    if (!isMap && !sep && !props.found) {
      // item is a value in a seq
      // → key & sep are empty, start does not include ? or :
      var valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
      coll.items.push(valueNode);
      offset = valueNode.range[2];
      if (isBlock(value)) onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
    } else {
      // item is a key+value pair
      // key value
      var keyStart = props.end;
      var keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
      if (isBlock(key)) onError(keyNode.range, 'BLOCK_IN_FLOW', blockMsg); // value properties

      var valueProps = (0, _resolveProps.resolveProps)(sep !== null && sep !== void 0 ? sep : [], {
        flow: fcName,
        indicator: 'map-value-ind',
        next: value,
        offset: keyNode.range[2],
        onError: onError,
        startOnNewline: false
      });

      if (valueProps.found) {
        if (!isMap && !props.found && ctx.options.strict) {
          if (sep) {
            var _iterator2 = _createForOfIteratorHelper(sep),
                _step2;

            try {
              for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                var _st = _step2.value;
                if (_st === valueProps.found) break;

                if (_st.type === 'newline') {
                  onError(_st, 'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
                  break;
                }
              }
            } catch (err) {
              _iterator2.e(err);
            } finally {
              _iterator2.f();
            }
          }

          if (props.start < valueProps.found.offset - 1024) onError(valueProps.found, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit flow sequence key');
        }
      } else if (value) {
        if ('source' in value && value.source && value.source[0] === ':') onError(value, 'MISSING_CHAR', "Missing space after : in ".concat(fcName));else onError(valueProps.start, 'MISSING_CHAR', "Missing , or : between ".concat(fcName, " items"));
      } // value value


      var _valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;

      if (_valueNode) {
        if (isBlock(value)) onError(_valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
      } else if (valueProps.comment) {
        if (keyNode.comment) keyNode.comment += '\n' + valueProps.comment;else keyNode.comment = valueProps.comment;
      }

      var pair = new _Pair.Pair(keyNode, _valueNode);
      if (ctx.options.keepSourceTokens) pair.srcToken = collItem;

      if (isMap) {
        var map = coll;
        if ((0, _utilMapIncludes.mapIncludes)(ctx, map.items, keyNode)) onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
        map.items.push(pair);
      } else {
        var _map = new _YAMLMap.YAMLMap(ctx.schema);

        _map.flow = true;

        _map.items.push(pair);

        coll.items.push(_map);
      }

      offset = _valueNode ? _valueNode.range[2] : valueProps.end;
    }
  }

  var expectedEnd = isMap ? '}' : ']';

  var _fc$end = _toArray(fc.end),
      ce = _fc$end[0],
      ee = _fc$end.slice(1);

  var cePos = offset;
  if (ce && ce.source === expectedEnd) cePos = ce.offset + ce.source.length;else {
    var name = fcName[0].toUpperCase() + fcName.substring(1);
    var msg = atRoot ? "".concat(name, " must end with a ").concat(expectedEnd) : "".concat(name, " in block collection must be sufficiently indented and end with a ").concat(expectedEnd);
    onError(offset, atRoot ? 'MISSING_CHAR' : 'BAD_INDENT', msg);
    if (ce && ce.source.length !== 1) ee.unshift(ce);
  }

  if (ee.length > 0) {
    var end = (0, _resolveEnd.resolveEnd)(ee, cePos, ctx.options.strict, onError);

    if (end.comment) {
      if (coll.comment) coll.comment += '\n' + end.comment;else coll.comment = end.comment;
    }

    coll.range = [fc.offset, cePos, end.offset];
  } else {
    coll.range = [fc.offset, cePos, cePos];
  }

  return coll;
}

},{"../nodes/Node.js":31,"../nodes/Pair.js":32,"../nodes/YAMLMap.js":34,"../nodes/YAMLSeq.js":35,"./resolve-end.js":13,"./resolve-props.js":16,"./util-contains-newline.js":17,"./util-map-includes.js":20}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveFlowScalar = resolveFlowScalar;

var _Scalar = require("../nodes/Scalar.js");

var _resolveEnd = require("./resolve-end.js");

function resolveFlowScalar(scalar, strict, onError) {
  var offset = scalar.offset,
      type = scalar.type,
      source = scalar.source,
      end = scalar.end;

  var _type;

  var value;

  var _onError = function _onError(rel, code, msg) {
    return onError(offset + rel, code, msg);
  };

  switch (type) {
    case 'scalar':
      _type = _Scalar.Scalar.PLAIN;
      value = plainValue(source, _onError);
      break;

    case 'single-quoted-scalar':
      _type = _Scalar.Scalar.QUOTE_SINGLE;
      value = singleQuotedValue(source, _onError);
      break;

    case 'double-quoted-scalar':
      _type = _Scalar.Scalar.QUOTE_DOUBLE;
      value = doubleQuotedValue(source, _onError);
      break;

    /* istanbul ignore next should not happen */

    default:
      onError(scalar, 'UNEXPECTED_TOKEN', "Expected a flow scalar value, but found: ".concat(type));
      return {
        value: '',
        type: null,
        comment: '',
        range: [offset, offset + source.length, offset + source.length]
      };
  }

  var valueEnd = offset + source.length;
  var re = (0, _resolveEnd.resolveEnd)(end, valueEnd, strict, onError);
  return {
    value: value,
    type: _type,
    comment: re.comment,
    range: [offset, valueEnd, re.offset]
  };
}

function plainValue(source, onError) {
  var badChar = '';

  switch (source[0]) {
    /* istanbul ignore next should not happen */
    case '\t':
      badChar = 'a tab character';
      break;

    case ',':
      badChar = 'flow indicator character ,';
      break;

    case '%':
      badChar = 'directive indicator character %';
      break;

    case '|':
    case '>':
      {
        badChar = "block scalar indicator ".concat(source[0]);
        break;
      }

    case '@':
    case '`':
      {
        badChar = "reserved character ".concat(source[0]);
        break;
      }
  }

  if (badChar) onError(0, 'BAD_SCALAR_START', "Plain value cannot start with ".concat(badChar));
  return foldLines(source);
}

function singleQuotedValue(source, onError) {
  if (source[source.length - 1] !== "'" || source.length === 1) onError(source.length, 'MISSING_CHAR', "Missing closing 'quote");
  return foldLines(source.slice(1, -1)).replace(/''/g, "'");
}

function foldLines(source) {
  var _match$, _match;

  /**
   * The negative lookbehind here and in the `re` RegExp is to
   * prevent causing a polynomial search time in certain cases.
   *
   * The try-catch is for Safari, which doesn't support this yet:
   * https://caniuse.com/js-regexp-lookbehind
   */
  var first, line;

  try {
    first = new RegExp('(.*?)(?<![ \t])[ \t]*\r?\n', 'sy');
    line = new RegExp('[ \t]*(.*?)(?:(?<![ \t])[ \t]*)?\r?\n', 'sy');
  } catch (_) {
    first = new RegExp("([\\s\\S]*?)[ \\t]*\\r?\\n", "y");
    line = new RegExp("[ \\t]*([\\s\\S]*?)[ \\t]*\\r?\\n", "y");
  }

  var match = first.exec(source);
  if (!match) return source;
  var res = match[1];
  var sep = ' ';
  var pos = first.lastIndex;
  line.lastIndex = pos;

  while (match = line.exec(source)) {
    if (match[1] === '') {
      if (sep === '\n') res += sep;else sep = '\n';
    } else {
      res += sep + match[1];
      sep = ' ';
    }

    pos = line.lastIndex;
  }

  var last = new RegExp("[ \\t]*([\\s\\S]*)", "y");
  last.lastIndex = pos;
  match = last.exec(source);
  return res + sep + ((_match$ = (_match = match) === null || _match === void 0 ? void 0 : _match[1]) !== null && _match$ !== void 0 ? _match$ : '');
}

function doubleQuotedValue(source, onError) {
  var res = '';

  for (var i = 1; i < source.length - 1; ++i) {
    var ch = source[i];
    if (ch === '\r' && source[i + 1] === '\n') continue;

    if (ch === '\n') {
      var _foldNewline = foldNewline(source, i),
          fold = _foldNewline.fold,
          offset = _foldNewline.offset;

      res += fold;
      i = offset;
    } else if (ch === '\\') {
      var next = source[++i];
      var cc = escapeCodes[next];
      if (cc) res += cc;else if (next === '\n') {
        // skip escaped newlines, but still trim the following line
        next = source[i + 1];

        while (next === ' ' || next === '\t') {
          next = source[++i + 1];
        }
      } else if (next === '\r' && source[i + 1] === '\n') {
        // skip escaped CRLF newlines, but still trim the following line
        next = source[++i + 1];

        while (next === ' ' || next === '\t') {
          next = source[++i + 1];
        }
      } else if (next === 'x' || next === 'u' || next === 'U') {
        var length = {
          x: 2,
          u: 4,
          U: 8
        }[next];
        res += parseCharCode(source, i + 1, length, onError);
        i += length;
      } else {
        var raw = source.substr(i - 1, 2);
        onError(i - 1, 'BAD_DQ_ESCAPE', "Invalid escape sequence ".concat(raw));
        res += raw;
      }
    } else if (ch === ' ' || ch === '\t') {
      // trim trailing whitespace
      var wsStart = i;
      var _next = source[i + 1];

      while (_next === ' ' || _next === '\t') {
        _next = source[++i + 1];
      }

      if (_next !== '\n' && !(_next === '\r' && source[i + 2] === '\n')) res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
    } else {
      res += ch;
    }
  }

  if (source[source.length - 1] !== '"' || source.length === 1) onError(source.length, 'MISSING_CHAR', 'Missing closing "quote');
  return res;
}
/**
 * Fold a single newline into a space, multiple newlines to N - 1 newlines.
 * Presumes `source[offset] === '\n'`
 */


function foldNewline(source, offset) {
  var fold = '';
  var ch = source[offset + 1];

  while (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
    if (ch === '\r' && source[offset + 2] !== '\n') break;
    if (ch === '\n') fold += '\n';
    offset += 1;
    ch = source[offset + 1];
  }

  if (!fold) fold = ' ';
  return {
    fold: fold,
    offset: offset
  };
}

var escapeCodes = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  e: '\x1b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  N: "\x85",
  _: "\xA0",
  L: "\u2028",
  P: "\u2029",
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  '\t': '\t'
};

function parseCharCode(source, offset, length, onError) {
  var cc = source.substr(offset, length);
  var ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
  var code = ok ? parseInt(cc, 16) : NaN;

  if (isNaN(code)) {
    var raw = source.substr(offset - 2, length + 2);
    onError(offset - 2, 'BAD_DQ_ESCAPE', "Invalid escape sequence ".concat(raw));
    return raw;
  }

  return String.fromCodePoint(code);
}

},{"../nodes/Scalar.js":33,"./resolve-end.js":13}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveProps = resolveProps;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function resolveProps(tokens, _ref) {
  var _start;

  var flow = _ref.flow,
      indicator = _ref.indicator,
      next = _ref.next,
      offset = _ref.offset,
      onError = _ref.onError,
      startOnNewline = _ref.startOnNewline;
  var spaceBefore = false;
  var atNewline = startOnNewline;
  var hasSpace = startOnNewline;
  var comment = '';
  var commentSep = '';
  var hasNewline = false;
  var hasNewlineAfterProp = false;
  var reqSpace = false;
  var anchor = null;
  var tag = null;
  var comma = null;
  var found = null;
  var start = null;

  var _iterator = _createForOfIteratorHelper(tokens),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var token = _step.value;

      if (reqSpace) {
        if (token.type !== 'space' && token.type !== 'newline' && token.type !== 'comma') onError(token.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
        reqSpace = false;
      }

      switch (token.type) {
        case 'space':
          // At the doc level, tabs at line start may be parsed
          // as leading white space rather than indentation.
          // In a flow collection, only the parser handles indent.
          if (!flow && atNewline && indicator !== 'doc-start' && token.source[0] === '\t') onError(token, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
          hasSpace = true;
          break;

        case 'comment':
          {
            if (!hasSpace) onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
            var cb = token.source.substring(1) || ' ';
            if (!comment) comment = cb;else comment += commentSep + cb;
            commentSep = '';
            atNewline = false;
            break;
          }

        case 'newline':
          if (atNewline) {
            if (comment) comment += token.source;else spaceBefore = true;
          } else commentSep += token.source;

          atNewline = true;
          hasNewline = true;
          if (anchor || tag) hasNewlineAfterProp = true;
          hasSpace = true;
          break;

        case 'anchor':
          if (anchor) onError(token, 'MULTIPLE_ANCHORS', 'A node can have at most one anchor');
          if (token.source.endsWith(':')) onError(token.offset + token.source.length - 1, 'BAD_ALIAS', 'Anchor ending in : is ambiguous', true);
          anchor = token;
          if (start === null) start = token.offset;
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;

        case 'tag':
          {
            if (tag) onError(token, 'MULTIPLE_TAGS', 'A node can have at most one tag');
            tag = token;
            if (start === null) start = token.offset;
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }

        case indicator:
          // Could here handle preceding comments differently
          if (anchor || tag) onError(token, 'BAD_PROP_ORDER', "Anchors and tags must be after the ".concat(token.source, " indicator"));
          if (found) onError(token, 'UNEXPECTED_TOKEN', "Unexpected ".concat(token.source, " in ").concat(flow !== null && flow !== void 0 ? flow : 'collection'));
          found = token;
          atNewline = false;
          hasSpace = false;
          break;

        case 'comma':
          if (flow) {
            if (comma) onError(token, 'UNEXPECTED_TOKEN', "Unexpected , in ".concat(flow));
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }

        // else fallthrough

        default:
          onError(token, 'UNEXPECTED_TOKEN', "Unexpected ".concat(token.type, " token"));
          atNewline = false;
          hasSpace = false;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var last = tokens[tokens.length - 1];
  var end = last ? last.offset + last.source.length : offset;
  if (reqSpace && next && next.type !== 'space' && next.type !== 'newline' && next.type !== 'comma' && (next.type !== 'scalar' || next.source !== '')) onError(next.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
  return {
    comma: comma,
    found: found,
    spaceBefore: spaceBefore,
    comment: comment,
    hasNewline: hasNewline,
    hasNewlineAfterProp: hasNewlineAfterProp,
    anchor: anchor,
    tag: tag,
    end: end,
    start: (_start = start) !== null && _start !== void 0 ? _start : end
  };
}

},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.containsNewline = containsNewline;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function containsNewline(key) {
  if (!key) return null;

  switch (key.type) {
    case 'alias':
    case 'scalar':
    case 'double-quoted-scalar':
    case 'single-quoted-scalar':
      if (key.source.includes('\n')) return true;

      if (key.end) {
        var _iterator = _createForOfIteratorHelper(key.end),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var st = _step.value;
            if (st.type === 'newline') return true;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return false;

    case 'flow-collection':
      var _iterator2 = _createForOfIteratorHelper(key.items),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var it = _step2.value;

          var _iterator3 = _createForOfIteratorHelper(it.start),
              _step3;

          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var _st2 = _step3.value;
              if (_st2.type === 'newline') return true;
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }

          if (it.sep) {
            var _iterator4 = _createForOfIteratorHelper(it.sep),
                _step4;

            try {
              for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                var _st = _step4.value;
                if (_st.type === 'newline') return true;
              }
            } catch (err) {
              _iterator4.e(err);
            } finally {
              _iterator4.f();
            }
          }

          if (containsNewline(it.key) || containsNewline(it.value)) return true;
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return false;

    default:
      return true;
  }
}

},{}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emptyScalarPosition = emptyScalarPosition;

function emptyScalarPosition(offset, before, pos) {
  if (before) {
    if (pos === null) pos = before.length;

    for (var i = pos - 1; i >= 0; --i) {
      var st = before[i];

      switch (st.type) {
        case 'space':
        case 'comment':
        case 'newline':
          offset -= st.source.length;
          continue;
      } // Technically, an empty scalar is immediately after the last non-empty
      // node, but it's more useful to place it after any whitespace.


      st = before[++i];

      while (((_st = st) === null || _st === void 0 ? void 0 : _st.type) === 'space') {
        var _st;

        offset += st.source.length;
        st = before[++i];
      }

      break;
    }
  }

  return offset;
}

},{}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flowIndentCheck = flowIndentCheck;

var _utilContainsNewline = require("./util-contains-newline.js");

function flowIndentCheck(indent, fc, onError) {
  if ((fc === null || fc === void 0 ? void 0 : fc.type) === 'flow-collection') {
    var end = fc.end[0];

    if (end.indent === indent && (end.source === ']' || end.source === '}') && (0, _utilContainsNewline.containsNewline)(fc)) {
      var msg = 'Flow end indicator should be more indented than parent';
      onError(end, 'BAD_INDENT', msg, true);
    }
  }
}

},{"./util-contains-newline.js":17}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapIncludes = mapIncludes;

var _Node = require("../nodes/Node.js");

function mapIncludes(ctx, items, search) {
  var uniqueKeys = ctx.options.uniqueKeys;
  if (uniqueKeys === false) return false;
  var isEqual = typeof uniqueKeys === 'function' ? uniqueKeys : function (a, b) {
    return a === b || (0, _Node.isScalar)(a) && (0, _Node.isScalar)(b) && a.value === b.value && !(a.value === '<<' && ctx.schema.merge);
  };
  return items.some(function (pair) {
    return isEqual(pair.key, search);
  });
}

},{"../nodes/Node.js":31}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Document = void 0;

var _Alias = require("../nodes/Alias.js");

var _Collection = require("../nodes/Collection.js");

var _Node = require("../nodes/Node.js");

var _Pair = require("../nodes/Pair.js");

var _toJS2 = require("../nodes/toJS.js");

var _Schema = require("../schema/Schema.js");

var _stringify = require("../stringify/stringify.js");

var _stringifyDocument = require("../stringify/stringifyDocument.js");

var _anchors = require("./anchors.js");

var _applyReviver = require("./applyReviver.js");

var _createNode2 = require("./createNode.js");

var _directives = require("./directives.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Document = /*#__PURE__*/function () {
  function Document(value, replacer, options) {
    var _options;

    _classCallCheck(this, Document);

    /** A comment before this Document */
    this.commentBefore = null;
    /** A comment immediately after this Document */

    this.comment = null;
    /** Errors encountered during parsing. */

    this.errors = [];
    /** Warnings encountered during parsing. */

    this.warnings = [];
    Object.defineProperty(this, _Node.NODE_TYPE, {
      value: _Node.DOC
    });
    var _replacer = null;

    if (typeof replacer === 'function' || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
      replacer = undefined;
    }

    var opt = Object.assign({
      intAsBigInt: false,
      keepSourceTokens: false,
      logLevel: 'warn',
      prettyErrors: true,
      strict: true,
      uniqueKeys: true,
      version: '1.2'
    }, options);
    this.options = opt;
    var version = opt.version;

    if ((_options = options) !== null && _options !== void 0 && _options._directives) {
      this.directives = options._directives.atDocument();
      if (this.directives.yaml.explicit) version = this.directives.yaml.version;
    } else this.directives = new _directives.Directives({
      version: version
    });

    this.setSchema(version, options);
    if (value === undefined) this.contents = null;else {
      this.contents = this.createNode(value, _replacer, options);
    }
  }
  /**
   * Create a deep copy of this Document and its contents.
   *
   * Custom Node values that inherit from `Object` still refer to their original instances.
   */


  _createClass(Document, [{
    key: "clone",
    value: function clone() {
      var copy = Object.create(Document.prototype, _defineProperty({}, _Node.NODE_TYPE, {
        value: _Node.DOC
      }));
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives) copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = (0, _Node.isNode)(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range) copy.range = this.range.slice();
      return copy;
    }
    /** Adds a value to the document. */

  }, {
    key: "add",
    value: function add(value) {
      if (assertCollection(this.contents)) this.contents.add(value);
    }
    /** Adds a value to the document. */

  }, {
    key: "addIn",
    value: function addIn(path, value) {
      if (assertCollection(this.contents)) this.contents.addIn(path, value);
    }
    /**
     * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
     *
     * If `node` already has an anchor, `name` is ignored.
     * Otherwise, the `node.anchor` value will be set to `name`,
     * or if an anchor with that name is already present in the document,
     * `name` will be used as a prefix for a new unique anchor.
     * If `name` is undefined, the generated anchor will use 'a' as a prefix.
     */

  }, {
    key: "createAlias",
    value: function createAlias(node, name) {
      if (!node.anchor) {
        var prev = (0, _anchors.anchorNames)(this);
        node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        !name || prev.has(name) ? (0, _anchors.findNewAnchor)(name || 'a', prev) : name;
      }

      return new _Alias.Alias(node.anchor);
    }
  }, {
    key: "createNode",
    value: function createNode(value, replacer, options) {
      var _options2;

      var _replacer = undefined;

      if (typeof replacer === 'function') {
        value = replacer.call({
          '': value
        }, '', value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        var keyToStr = function keyToStr(v) {
          return typeof v === 'number' || v instanceof String || v instanceof Number;
        };

        var asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0) replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }

      var _ref = (_options2 = options) !== null && _options2 !== void 0 ? _options2 : {},
          aliasDuplicateObjects = _ref.aliasDuplicateObjects,
          anchorPrefix = _ref.anchorPrefix,
          flow = _ref.flow,
          keepUndefined = _ref.keepUndefined,
          onTagObj = _ref.onTagObj,
          tag = _ref.tag;

      var _createNodeAnchors = (0, _anchors.createNodeAnchors)(this, // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      anchorPrefix || 'a'),
          onAnchor = _createNodeAnchors.onAnchor,
          setAnchors = _createNodeAnchors.setAnchors,
          sourceObjects = _createNodeAnchors.sourceObjects;

      var ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects !== null && aliasDuplicateObjects !== void 0 ? aliasDuplicateObjects : true,
        keepUndefined: keepUndefined !== null && keepUndefined !== void 0 ? keepUndefined : false,
        onAnchor: onAnchor,
        onTagObj: onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects: sourceObjects
      };
      var node = (0, _createNode2.createNode)(value, tag, ctx);
      if (flow && (0, _Node.isCollection)(node)) node.flow = true;
      setAnchors();
      return node;
    }
    /**
     * Convert a key and a value into a `Pair` using the current schema,
     * recursively wrapping all values as `Scalar` or `Collection` nodes.
     */

  }, {
    key: "createPair",
    value: function createPair(key, value) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var k = this.createNode(key, null, options);
      var v = this.createNode(value, null, options);
      return new _Pair.Pair(k, v);
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */

  }, {
    key: "delete",
    value: function _delete(key) {
      return assertCollection(this.contents) ? this.contents["delete"](key) : false;
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */

  }, {
    key: "deleteIn",
    value: function deleteIn(path) {
      if ((0, _Collection.isEmptyPath)(path)) {
        if (this.contents == null) return false;
        this.contents = null;
        return true;
      }

      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */

  }, {
    key: "get",
    value: function get(key, keepScalar) {
      return (0, _Node.isCollection)(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    /**
     * Returns item at `path`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */

  }, {
    key: "getIn",
    value: function getIn(path, keepScalar) {
      if ((0, _Collection.isEmptyPath)(path)) return !keepScalar && (0, _Node.isScalar)(this.contents) ? this.contents.value : this.contents;
      return (0, _Node.isCollection)(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    /**
     * Checks if the document includes a value with the key `key`.
     */

  }, {
    key: "has",
    value: function has(key) {
      return (0, _Node.isCollection)(this.contents) ? this.contents.has(key) : false;
    }
    /**
     * Checks if the document includes a value at `path`.
     */

  }, {
    key: "hasIn",
    value: function hasIn(path) {
      if ((0, _Collection.isEmptyPath)(path)) return this.contents !== undefined;
      return (0, _Node.isCollection)(this.contents) ? this.contents.hasIn(path) : false;
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */

  }, {
    key: "set",
    value: function set(key, value) {
      if (this.contents == null) {
        this.contents = (0, _Collection.collectionFromPath)(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */

  }, {
    key: "setIn",
    value: function setIn(path, value) {
      if ((0, _Collection.isEmptyPath)(path)) this.contents = value;else if (this.contents == null) {
        this.contents = (0, _Collection.collectionFromPath)(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    /**
     * Change the YAML version and schema used by the document.
     * A `null` version disables support for directives, explicit tags, anchors, and aliases.
     * It also requires the `schema` option to be given as a `Schema` instance value.
     *
     * Overrides all previously set schema options.
     */

  }, {
    key: "setSchema",
    value: function setSchema(version) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (typeof version === 'number') version = String(version);
      var opt;

      switch (version) {
        case '1.1':
          if (this.directives) this.directives.yaml.version = '1.1';else this.directives = new _directives.Directives({
            version: '1.1'
          });
          opt = {
            merge: true,
            resolveKnownTags: false,
            schema: 'yaml-1.1'
          };
          break;

        case '1.2':
        case 'next':
          if (this.directives) this.directives.yaml.version = version;else this.directives = new _directives.Directives({
            version: version
          });
          opt = {
            merge: false,
            resolveKnownTags: true,
            schema: 'core'
          };
          break;

        case null:
          if (this.directives) delete this.directives;
          opt = null;
          break;

        default:
          {
            var sv = JSON.stringify(version);
            throw new Error("Expected '1.1', '1.2' or null as first argument, but found: ".concat(sv));
          }
      } // Not using `instanceof Schema` to allow for duck typing


      if (options.schema instanceof Object) this.schema = options.schema;else if (opt) this.schema = new _Schema.Schema(Object.assign(opt, options));else throw new Error("With a null YAML version, the { schema: Schema } option is required");
    } // json & jsonArg are only used from toJSON()

  }, {
    key: "toJS",
    value: function toJS() {
      var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          json = _ref2.json,
          jsonArg = _ref2.jsonArg,
          mapAsMap = _ref2.mapAsMap,
          maxAliasCount = _ref2.maxAliasCount,
          onAnchor = _ref2.onAnchor,
          reviver = _ref2.reviver;

      var ctx = {
        anchors: new Map(),
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100,
        stringify: _stringify.stringify
      };
      var res = (0, _toJS2.toJS)(this.contents, jsonArg !== null && jsonArg !== void 0 ? jsonArg : '', ctx);

      if (typeof onAnchor === 'function') {
        var _iterator = _createForOfIteratorHelper(ctx.anchors.values()),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var _step$value = _step.value,
                count = _step$value.count,
                _res = _step$value.res;
            onAnchor(_res, count);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return typeof reviver === 'function' ? (0, _applyReviver.applyReviver)(reviver, {
        '': res
      }, '', res) : res;
    }
    /**
     * A JSON representation of the document `contents`.
     *
     * @param jsonArg Used by `JSON.stringify` to indicate the array index or
     *   property name.
     */

  }, {
    key: "toJSON",
    value: function toJSON(jsonArg, onAnchor) {
      return this.toJS({
        json: true,
        jsonArg: jsonArg,
        mapAsMap: false,
        onAnchor: onAnchor
      });
    }
    /** A YAML representation of the document. */

  }, {
    key: "toString",
    value: function toString() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');

      if ('indent' in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        var s = JSON.stringify(options.indent);
        throw new Error("\"indent\" option must be a positive integer, not ".concat(s));
      }

      return (0, _stringifyDocument.stringifyDocument)(this, options);
    }
  }]);

  return Document;
}();

exports.Document = Document;

function assertCollection(contents) {
  if ((0, _Node.isCollection)(contents)) return true;
  throw new Error('Expected a YAML collection as document contents');
}

},{"../nodes/Alias.js":29,"../nodes/Collection.js":30,"../nodes/Node.js":31,"../nodes/Pair.js":32,"../nodes/toJS.js":37,"../schema/Schema.js":46,"../stringify/stringify.js":67,"../stringify/stringifyDocument.js":70,"./anchors.js":22,"./applyReviver.js":23,"./createNode.js":24,"./directives.js":25}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.anchorIsValid = anchorIsValid;
exports.anchorNames = anchorNames;
exports.createNodeAnchors = createNodeAnchors;
exports.findNewAnchor = findNewAnchor;

var _Node = require("../nodes/Node.js");

var _visit = require("../visit.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * Verify that the input string is a valid anchor.
 *
 * Will throw on errors.
 */
function anchorIsValid(anchor) {
  if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
    var sa = JSON.stringify(anchor);
    var msg = "Anchor must not contain whitespace or control characters: ".concat(sa);
    throw new Error(msg);
  }

  return true;
}

function anchorNames(root) {
  var anchors = new Set();
  (0, _visit.visit)(root, {
    Value: function Value(_key, node) {
      if (node.anchor) anchors.add(node.anchor);
    }
  });
  return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */


function findNewAnchor(prefix, exclude) {
  for (var i = 1; true; ++i) {
    var name = "".concat(prefix).concat(i);
    if (!exclude.has(name)) return name;
  }
}

function createNodeAnchors(doc, prefix) {
  var aliasObjects = [];
  var sourceObjects = new Map();
  var prevAnchors = null;
  return {
    onAnchor: function onAnchor(source) {
      aliasObjects.push(source);
      if (!prevAnchors) prevAnchors = anchorNames(doc);
      var anchor = findNewAnchor(prefix, prevAnchors);
      prevAnchors.add(anchor);
      return anchor;
    },

    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: function setAnchors() {
      var _iterator = _createForOfIteratorHelper(aliasObjects),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var source = _step.value;
          var ref = sourceObjects.get(source);

          if (_typeof(ref) === 'object' && ref.anchor && ((0, _Node.isScalar)(ref.node) || (0, _Node.isCollection)(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            var error = new Error('Failed to resolve repeated object (this should not happen)');
            error.source = source;
            throw error;
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    },
    sourceObjects: sourceObjects
  };
}

},{"../nodes/Node.js":31,"../visit.js":74}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyReviver = applyReviver;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/**
 * Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
 * in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
 * 2021 edition: https://tc39.es/ecma262/#sec-json.parse
 *
 * Includes extensions for handling Map and Set objects.
 */
function applyReviver(reviver, obj, key, val) {
  if (val && _typeof(val) === 'object') {
    if (Array.isArray(val)) {
      for (var i = 0, len = val.length; i < len; ++i) {
        var v0 = val[i];
        var v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === undefined) delete val[i];else if (v1 !== v0) val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (var _i = 0, _Array$from = Array.from(val.keys()); _i < _Array$from.length; _i++) {
        var k = _Array$from[_i];

        var _v = val.get(k);

        var _v2 = applyReviver(reviver, val, k, _v);

        if (_v2 === undefined) val["delete"](k);else if (_v2 !== _v) val.set(k, _v2);
      }
    } else if (val instanceof Set) {
      for (var _i2 = 0, _Array$from2 = Array.from(val); _i2 < _Array$from2.length; _i2++) {
        var _v3 = _Array$from2[_i2];

        var _v4 = applyReviver(reviver, val, _v3, _v3);

        if (_v4 === undefined) val["delete"](_v3);else if (_v4 !== _v3) {
          val["delete"](_v3);
          val.add(_v4);
        }
      }
    } else {
      for (var _i3 = 0, _Object$entries = Object.entries(val); _i3 < _Object$entries.length; _i3++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i3], 2),
            _k = _Object$entries$_i[0],
            _v5 = _Object$entries$_i[1];

        var _v6 = applyReviver(reviver, val, _k, _v5);

        if (_v6 === undefined) delete val[_k];else if (_v6 !== _v5) val[_k] = _v6;
      }
    }
  }

  return reviver.call(obj, key, val);
}

},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createNode = createNode;

var _Alias = require("../nodes/Alias.js");

var _Node = require("../nodes/Node.js");

var _Scalar = require("../nodes/Scalar.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var defaultTagPrefix = 'tag:yaml.org,2002:';

function findTagObject(value, tagName, tags) {
  if (tagName) {
    var _match$find;

    var match = tags.filter(function (t) {
      return t.tag === tagName;
    });
    var tagObj = (_match$find = match.find(function (t) {
      return !t.format;
    })) !== null && _match$find !== void 0 ? _match$find : match[0];
    if (!tagObj) throw new Error("Tag ".concat(tagName, " not found"));
    return tagObj;
  }

  return tags.find(function (t) {
    var _t$identify;

    return ((_t$identify = t.identify) === null || _t$identify === void 0 ? void 0 : _t$identify.call(t, value)) && !t.format;
  });
}

function createNode(value, tagName, ctx) {
  var _tagName, _tagObj;

  if ((0, _Node.isDocument)(value)) value = value.contents;
  if ((0, _Node.isNode)(value)) return value;

  if ((0, _Node.isPair)(value)) {
    var _ctx$schema$MAP$creat, _ctx$schema$MAP;

    var map = (_ctx$schema$MAP$creat = (_ctx$schema$MAP = ctx.schema[_Node.MAP]).createNode) === null || _ctx$schema$MAP$creat === void 0 ? void 0 : _ctx$schema$MAP$creat.call(_ctx$schema$MAP, ctx.schema, null, ctx);
    map.items.push(value);
    return map;
  }

  if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== 'undefined' && value instanceof BigInt // not supported everywhere
  ) {
    // https://tc39.es/ecma262/#sec-serializejsonproperty
    value = value.valueOf();
  }

  var aliasDuplicateObjects = ctx.aliasDuplicateObjects,
      onAnchor = ctx.onAnchor,
      onTagObj = ctx.onTagObj,
      schema = ctx.schema,
      sourceObjects = ctx.sourceObjects; // Detect duplicate references to the same object & use Alias nodes for all
  // after first. The `ref` wrapper allows for circular references to resolve.

  var ref = undefined;

  if (aliasDuplicateObjects && value && _typeof(value) === 'object') {
    ref = sourceObjects.get(value);

    if (ref) {
      if (!ref.anchor) ref.anchor = onAnchor(value);
      return new _Alias.Alias(ref.anchor);
    } else {
      ref = {
        anchor: null,
        node: null
      };
      sourceObjects.set(value, ref);
    }
  }

  if ((_tagName = tagName) !== null && _tagName !== void 0 && _tagName.startsWith('!!')) tagName = defaultTagPrefix + tagName.slice(2);
  var tagObj = findTagObject(value, tagName, schema.tags);

  if (!tagObj) {
    if (value && typeof value.toJSON === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      value = value.toJSON();
    }

    if (!value || _typeof(value) !== 'object') {
      var _node = new _Scalar.Scalar(value);

      if (ref) ref.node = _node;
      return _node;
    }

    tagObj = value instanceof Map ? schema[_Node.MAP] : Symbol.iterator in Object(value) ? schema[_Node.SEQ] : schema[_Node.MAP];
  }

  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  }

  var node = (_tagObj = tagObj) !== null && _tagObj !== void 0 && _tagObj.createNode ? tagObj.createNode(ctx.schema, value, ctx) : new _Scalar.Scalar(value);
  if (tagName) node.tag = tagName;
  if (ref) ref.node = node;
  return node;
}

},{"../nodes/Alias.js":29,"../nodes/Node.js":31,"../nodes/Scalar.js":33}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Directives = void 0;

var _Node = require("../nodes/Node.js");

var _visit = require("../visit.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var escapeChars = {
  '!': '%21',
  ',': '%2C',
  '[': '%5B',
  ']': '%5D',
  '{': '%7B',
  '}': '%7D'
};

var escapeTagName = function escapeTagName(tn) {
  return tn.replace(/[!,[\]{}]/g, function (ch) {
    return escapeChars[ch];
  });
};

var Directives = /*#__PURE__*/function () {
  function Directives(yaml, tags) {
    _classCallCheck(this, Directives);

    /**
     * The directives-end/doc-start marker `---`. If `null`, a marker may still be
     * included in the document's stringified representation.
     */
    this.docStart = null;
    /** The doc-end marker `...`.  */

    this.docEnd = false;
    this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
    this.tags = Object.assign({}, Directives.defaultTags, tags);
  }

  _createClass(Directives, [{
    key: "clone",
    value: function clone() {
      var copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    /**
     * During parsing, get a Directives instance for the current document and
     * update the stream state according to the current version's spec.
     */

  }, {
    key: "atDocument",
    value: function atDocument() {
      var res = new Directives(this.yaml, this.tags);

      switch (this.yaml.version) {
        case '1.1':
          this.atNextDocument = true;
          break;

        case '1.2':
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: '1.2'
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }

      return res;
    }
    /**
     * @param onError - May be called even if the action was successful
     * @returns `true` on success
     */

  }, {
    key: "add",
    value: function add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = {
          explicit: Directives.defaultYaml.explicit,
          version: '1.1'
        };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }

      var parts = line.trim().split(/[ \t]+/);
      var name = parts.shift();

      switch (name) {
        case '%TAG':
          {
            if (parts.length !== 2) {
              onError(0, '%TAG directive should contain exactly two parts');
              if (parts.length < 2) return false;
            }

            var _parts = _slicedToArray(parts, 2),
                handle = _parts[0],
                prefix = _parts[1];

            this.tags[handle] = prefix;
            return true;
          }

        case '%YAML':
          {
            this.yaml.explicit = true;

            if (parts.length !== 1) {
              onError(0, '%YAML directive should contain exactly one part');
              return false;
            }

            var _parts2 = _slicedToArray(parts, 1),
                version = _parts2[0];

            if (version === '1.1' || version === '1.2') {
              this.yaml.version = version;
              return true;
            } else {
              var isValid = /^\d+\.\d+$/.test(version);
              onError(6, "Unsupported YAML version ".concat(version), isValid);
              return false;
            }
          }

        default:
          onError(0, "Unknown directive ".concat(name), true);
          return false;
      }
    }
    /**
     * Resolves a tag, matching handles to those defined in %TAG directives.
     *
     * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
     *   `'!local'` tag, or `null` if unresolvable.
     */

  }, {
    key: "tagName",
    value: function tagName(source, onError) {
      if (source === '!') return '!'; // non-specific tag

      if (source[0] !== '!') {
        onError("Not a valid tag: ".concat(source));
        return null;
      }

      if (source[1] === '<') {
        var verbatim = source.slice(2, -1);

        if (verbatim === '!' || verbatim === '!!') {
          onError("Verbatim tags aren't resolved, so ".concat(source, " is invalid."));
          return null;
        }

        if (source[source.length - 1] !== '>') onError('Verbatim tags must end with a >');
        return verbatim;
      }

      var _source$match = source.match(/^(.*!)([^!]*)$/),
          _source$match2 = _slicedToArray(_source$match, 3),
          handle = _source$match2[1],
          suffix = _source$match2[2];

      if (!suffix) onError("The ".concat(source, " tag has no suffix"));
      var prefix = this.tags[handle];
      if (prefix) return prefix + decodeURIComponent(suffix);
      if (handle === '!') return source; // local tag

      onError("Could not resolve tag: ".concat(source));
      return null;
    }
    /**
     * Given a fully resolved tag, returns its printable string form,
     * taking into account current tag prefixes and defaults.
     */

  }, {
    key: "tagString",
    value: function tagString(tag) {
      for (var _i2 = 0, _Object$entries = Object.entries(this.tags); _i2 < _Object$entries.length; _i2++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i2], 2),
            handle = _Object$entries$_i[0],
            prefix = _Object$entries$_i[1];

        if (tag.startsWith(prefix)) return handle + escapeTagName(tag.substring(prefix.length));
      }

      return tag[0] === '!' ? tag : "!<".concat(tag, ">");
    }
  }, {
    key: "toString",
    value: function toString(doc) {
      var lines = this.yaml.explicit ? ["%YAML ".concat(this.yaml.version || '1.2')] : [];
      var tagEntries = Object.entries(this.tags);
      var tagNames;

      if (doc && tagEntries.length > 0 && (0, _Node.isNode)(doc.contents)) {
        var tags = {};
        (0, _visit.visit)(doc.contents, function (_key, node) {
          if ((0, _Node.isNode)(node) && node.tag) tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else tagNames = [];

      var _loop = function _loop() {
        var _tagEntries$_i = _slicedToArray(_tagEntries[_i3], 2),
            handle = _tagEntries$_i[0],
            prefix = _tagEntries$_i[1];

        if (handle === '!!' && prefix === 'tag:yaml.org,2002:') return "continue";
        if (!doc || tagNames.some(function (tn) {
          return tn.startsWith(prefix);
        })) lines.push("%TAG ".concat(handle, " ").concat(prefix));
      };

      for (var _i3 = 0, _tagEntries = tagEntries; _i3 < _tagEntries.length; _i3++) {
        var _ret = _loop();

        if (_ret === "continue") continue;
      }

      return lines.join('\n');
    }
  }]);

  return Directives;
}();

exports.Directives = Directives;
Directives.defaultYaml = {
  explicit: false,
  version: '1.2'
};
Directives.defaultTags = {
  '!!': 'tag:yaml.org,2002:'
};

},{"../nodes/Node.js":31,"../visit.js":74}],26:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prettifyError = exports.YAMLWarning = exports.YAMLParseError = exports.YAMLError = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var YAMLError = /*#__PURE__*/function (_Error) {
  _inherits(YAMLError, _Error);

  var _super = _createSuper(YAMLError);

  function YAMLError(name, pos, code, message) {
    var _this;

    _classCallCheck(this, YAMLError);

    _this = _super.call(this);
    _this.name = name;
    _this.code = code;
    _this.message = message;
    _this.pos = pos;
    return _this;
  }

  return _createClass(YAMLError);
}( /*#__PURE__*/_wrapNativeSuper(Error));

exports.YAMLError = YAMLError;

var YAMLParseError = /*#__PURE__*/function (_YAMLError) {
  _inherits(YAMLParseError, _YAMLError);

  var _super2 = _createSuper(YAMLParseError);

  function YAMLParseError(pos, code, message) {
    _classCallCheck(this, YAMLParseError);

    return _super2.call(this, 'YAMLParseError', pos, code, message);
  }

  return _createClass(YAMLParseError);
}(YAMLError);

exports.YAMLParseError = YAMLParseError;

var YAMLWarning = /*#__PURE__*/function (_YAMLError2) {
  _inherits(YAMLWarning, _YAMLError2);

  var _super3 = _createSuper(YAMLWarning);

  function YAMLWarning(pos, code, message) {
    _classCallCheck(this, YAMLWarning);

    return _super3.call(this, 'YAMLWarning', pos, code, message);
  }

  return _createClass(YAMLWarning);
}(YAMLError);

exports.YAMLWarning = YAMLWarning;

var prettifyError = function prettifyError(src, lc) {
  return function (error) {
    if (error.pos[0] === -1) return;
    error.linePos = error.pos.map(function (pos) {
      return lc.linePos(pos);
    });
    var _error$linePos$ = error.linePos[0],
        line = _error$linePos$.line,
        col = _error$linePos$.col;
    error.message += " at line ".concat(line, ", column ").concat(col);
    var ci = col - 1;
    var lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, ''); // Trim to max 80 chars, keeping col position near the middle

    if (ci >= 60 && lineStr.length > 80) {
      var trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = '…' + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }

    if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + '…'; // Include previous line in context if pointing at line start

    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      // Regexp won't match if start is trimmed
      var prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80) prev = prev.substring(0, 79) + '…\n';
      lineStr = prev + lineStr;
    }

    if (/[^ ]/.test(lineStr)) {
      var count = 1;
      var end = error.linePos[1];

      if (end && end.line === line && end.col > col) {
        count = Math.min(end.col - col, 80 - ci);
      }

      var pointer = ' '.repeat(ci) + '^'.repeat(count);
      error.message += ":\n\n".concat(lineStr, "\n").concat(pointer, "\n");
    }
  };
};

exports.prettifyError = prettifyError;

},{}],27:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Alias", {
  enumerable: true,
  get: function get() {
    return _Alias.Alias;
  }
});
exports.CST = void 0;
Object.defineProperty(exports, "Composer", {
  enumerable: true,
  get: function get() {
    return _composer.Composer;
  }
});
Object.defineProperty(exports, "Document", {
  enumerable: true,
  get: function get() {
    return _Document.Document;
  }
});
Object.defineProperty(exports, "Lexer", {
  enumerable: true,
  get: function get() {
    return _lexer.Lexer;
  }
});
Object.defineProperty(exports, "LineCounter", {
  enumerable: true,
  get: function get() {
    return _lineCounter.LineCounter;
  }
});
Object.defineProperty(exports, "Pair", {
  enumerable: true,
  get: function get() {
    return _Pair.Pair;
  }
});
Object.defineProperty(exports, "Parser", {
  enumerable: true,
  get: function get() {
    return _parser.Parser;
  }
});
Object.defineProperty(exports, "Scalar", {
  enumerable: true,
  get: function get() {
    return _Scalar.Scalar;
  }
});
Object.defineProperty(exports, "Schema", {
  enumerable: true,
  get: function get() {
    return _Schema.Schema;
  }
});
Object.defineProperty(exports, "YAMLError", {
  enumerable: true,
  get: function get() {
    return _errors.YAMLError;
  }
});
Object.defineProperty(exports, "YAMLMap", {
  enumerable: true,
  get: function get() {
    return _YAMLMap.YAMLMap;
  }
});
Object.defineProperty(exports, "YAMLParseError", {
  enumerable: true,
  get: function get() {
    return _errors.YAMLParseError;
  }
});
Object.defineProperty(exports, "YAMLSeq", {
  enumerable: true,
  get: function get() {
    return _YAMLSeq.YAMLSeq;
  }
});
Object.defineProperty(exports, "YAMLWarning", {
  enumerable: true,
  get: function get() {
    return _errors.YAMLWarning;
  }
});
Object.defineProperty(exports, "isAlias", {
  enumerable: true,
  get: function get() {
    return _Node.isAlias;
  }
});
Object.defineProperty(exports, "isCollection", {
  enumerable: true,
  get: function get() {
    return _Node.isCollection;
  }
});
Object.defineProperty(exports, "isDocument", {
  enumerable: true,
  get: function get() {
    return _Node.isDocument;
  }
});
Object.defineProperty(exports, "isMap", {
  enumerable: true,
  get: function get() {
    return _Node.isMap;
  }
});
Object.defineProperty(exports, "isNode", {
  enumerable: true,
  get: function get() {
    return _Node.isNode;
  }
});
Object.defineProperty(exports, "isPair", {
  enumerable: true,
  get: function get() {
    return _Node.isPair;
  }
});
Object.defineProperty(exports, "isScalar", {
  enumerable: true,
  get: function get() {
    return _Node.isScalar;
  }
});
Object.defineProperty(exports, "isSeq", {
  enumerable: true,
  get: function get() {
    return _Node.isSeq;
  }
});
Object.defineProperty(exports, "parse", {
  enumerable: true,
  get: function get() {
    return _publicApi.parse;
  }
});
Object.defineProperty(exports, "parseAllDocuments", {
  enumerable: true,
  get: function get() {
    return _publicApi.parseAllDocuments;
  }
});
Object.defineProperty(exports, "parseDocument", {
  enumerable: true,
  get: function get() {
    return _publicApi.parseDocument;
  }
});
Object.defineProperty(exports, "stringify", {
  enumerable: true,
  get: function get() {
    return _publicApi.stringify;
  }
});
Object.defineProperty(exports, "visit", {
  enumerable: true,
  get: function get() {
    return _visit.visit;
  }
});
Object.defineProperty(exports, "visitAsync", {
  enumerable: true,
  get: function get() {
    return _visit.visitAsync;
  }
});

var _composer = require("./compose/composer.js");

var _Document = require("./doc/Document.js");

var _Schema = require("./schema/Schema.js");

var _errors = require("./errors.js");

var _Alias = require("./nodes/Alias.js");

var _Node = require("./nodes/Node.js");

var _Pair = require("./nodes/Pair.js");

var _Scalar = require("./nodes/Scalar.js");

var _YAMLMap = require("./nodes/YAMLMap.js");

var _YAMLSeq = require("./nodes/YAMLSeq.js");

var cst = _interopRequireWildcard(require("./parse/cst.js"));

exports.CST = cst;

var _lexer = require("./parse/lexer.js");

var _lineCounter = require("./parse/line-counter.js");

var _parser = require("./parse/parser.js");

var _publicApi = require("./public-api.js");

var _visit = require("./visit.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

},{"./compose/composer.js":9,"./doc/Document.js":21,"./errors.js":26,"./nodes/Alias.js":29,"./nodes/Node.js":31,"./nodes/Pair.js":32,"./nodes/Scalar.js":33,"./nodes/YAMLMap.js":34,"./nodes/YAMLSeq.js":35,"./parse/cst.js":41,"./parse/lexer.js":42,"./parse/line-counter.js":43,"./parse/parser.js":44,"./public-api.js":45,"./schema/Schema.js":46,"./visit.js":74}],28:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debug = debug;
exports.warn = warn;

function debug(logLevel) {
  var _console;

  for (var _len = arguments.length, messages = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    messages[_key - 1] = arguments[_key];
  }

  if (logLevel === 'debug') (_console = console).log.apply(_console, messages);
}

function warn(logLevel, warning) {
  if (logLevel === 'debug' || logLevel === 'warn') {
    if (typeof process !== 'undefined' && process.emitWarning) process.emitWarning(warning);else console.warn(warning);
  }
}

}).call(this)}).call(this,require('_process'))
},{"_process":4}],29:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Alias = void 0;

var _anchors = require("../doc/anchors.js");

var _visit = require("../visit.js");

var _Node = require("./Node.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Alias = /*#__PURE__*/function (_NodeBase) {
  _inherits(Alias, _NodeBase);

  var _super = _createSuper(Alias);

  function Alias(source) {
    var _this;

    _classCallCheck(this, Alias);

    _this = _super.call(this, _Node.ALIAS);
    _this.source = source;
    Object.defineProperty(_assertThisInitialized(_this), 'tag', {
      set: function set() {
        throw new Error('Alias nodes cannot have tags');
      }
    });
    return _this;
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */


  _createClass(Alias, [{
    key: "resolve",
    value: function resolve(doc) {
      var _this2 = this;

      var found = undefined;
      (0, _visit.visit)(doc, {
        Node: function Node(_key, node) {
          if (node === _this2) return _visit.visit.BREAK;
          if (node.anchor === _this2.source) found = node;
        }
      });
      return found;
    }
  }, {
    key: "toJSON",
    value: function toJSON(_arg, ctx) {
      if (!ctx) return {
        source: this.source
      };
      var anchors = ctx.anchors,
          doc = ctx.doc,
          maxAliasCount = ctx.maxAliasCount;
      var source = this.resolve(doc);

      if (!source) {
        var msg = "Unresolved alias (the anchor must be set before the alias): ".concat(this.source);
        throw new ReferenceError(msg);
      }

      var data = anchors.get(source);
      /* istanbul ignore if */

      if (!data || data.res === undefined) {
        var _msg = 'This should not happen: Alias anchor was not resolved?';
        throw new ReferenceError(_msg);
      }

      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0) data.aliasCount = getAliasCount(doc, source, anchors);

        if (data.count * data.aliasCount > maxAliasCount) {
          var _msg2 = 'Excessive alias count indicates a resource exhaustion attack';
          throw new ReferenceError(_msg2);
        }
      }

      return data.res;
    }
  }, {
    key: "toString",
    value: function toString(ctx, _onComment, _onChompKeep) {
      var src = "*".concat(this.source);

      if (ctx) {
        (0, _anchors.anchorIsValid)(this.source);

        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          var msg = "Unresolved alias (the anchor must be set before the alias): ".concat(this.source);
          throw new Error(msg);
        }

        if (ctx.implicitKey) return "".concat(src, " ");
      }

      return src;
    }
  }]);

  return Alias;
}(_Node.NodeBase);

exports.Alias = Alias;

function getAliasCount(doc, node, anchors) {
  if ((0, _Node.isAlias)(node)) {
    var source = node.resolve(doc);
    var anchor = anchors && source && anchors.get(source);
    return anchor ? anchor.count * anchor.aliasCount : 0;
  } else if ((0, _Node.isCollection)(node)) {
    var count = 0;

    var _iterator = _createForOfIteratorHelper(node.items),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var item = _step.value;
        var c = getAliasCount(doc, item, anchors);
        if (c > count) count = c;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return count;
  } else if ((0, _Node.isPair)(node)) {
    var kc = getAliasCount(doc, node.key, anchors);
    var vc = getAliasCount(doc, node.value, anchors);
    return Math.max(kc, vc);
  }

  return 1;
}

},{"../doc/anchors.js":22,"../visit.js":74,"./Node.js":31}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Collection = void 0;
exports.collectionFromPath = collectionFromPath;
exports.isEmptyPath = void 0;

var _createNode = require("../doc/createNode.js");

var _Node = require("./Node.js");

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function collectionFromPath(schema, path, value) {
  var v = value;

  for (var i = path.length - 1; i >= 0; --i) {
    var k = path[i];

    if (typeof k === 'number' && Number.isInteger(k) && k >= 0) {
      var a = [];
      a[k] = v;
      v = a;
    } else {
      v = new Map([[k, v]]);
    }
  }

  return (0, _createNode.createNode)(v, undefined, {
    aliasDuplicateObjects: false,
    keepUndefined: false,
    onAnchor: function onAnchor() {
      throw new Error('This should not happen, please report a bug.');
    },
    schema: schema,
    sourceObjects: new Map()
  });
} // Type guard is intentionally a little wrong so as to be more useful,
// as it does not cover untypable empty non-string iterables (e.g. []).


var isEmptyPath = function isEmptyPath(path) {
  return path == null || _typeof(path) === 'object' && !!path[Symbol.iterator]().next().done;
};

exports.isEmptyPath = isEmptyPath;

var Collection = /*#__PURE__*/function (_NodeBase) {
  _inherits(Collection, _NodeBase);

  var _super = _createSuper(Collection);

  function Collection(type, schema) {
    var _this;

    _classCallCheck(this, Collection);

    _this = _super.call(this, type);
    Object.defineProperty(_assertThisInitialized(_this), 'schema', {
      value: schema,
      configurable: true,
      enumerable: false,
      writable: true
    });
    return _this;
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */


  _createClass(Collection, [{
    key: "clone",
    value: function clone(schema) {
      var copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema) copy.schema = schema;
      copy.items = copy.items.map(function (it) {
        return (0, _Node.isNode)(it) || (0, _Node.isPair)(it) ? it.clone(schema) : it;
      });
      if (this.range) copy.range = this.range.slice();
      return copy;
    }
    /**
     * Adds a value to the collection. For `!!map` and `!!omap` the value must
     * be a Pair instance or a `{ key, value }` object, which may not have a key
     * that already exists in the map.
     */

  }, {
    key: "addIn",
    value: function addIn(path, value) {
      if (isEmptyPath(path)) this.add(value);else {
        var _path = _toArray(path),
            key = _path[0],
            rest = _path.slice(1);

        var node = this.get(key, true);
        if ((0, _Node.isCollection)(node)) node.addIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
      }
    }
    /**
     * Removes a value from the collection.
     * @returns `true` if the item was found and removed.
     */

  }, {
    key: "deleteIn",
    value: function deleteIn(path) {
      var _path2 = _toArray(path),
          key = _path2[0],
          rest = _path2.slice(1);

      if (rest.length === 0) return this["delete"](key);
      var node = this.get(key, true);
      if ((0, _Node.isCollection)(node)) return node.deleteIn(rest);else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */

  }, {
    key: "getIn",
    value: function getIn(path, keepScalar) {
      var _path3 = _toArray(path),
          key = _path3[0],
          rest = _path3.slice(1);

      var node = this.get(key, true);
      if (rest.length === 0) return !keepScalar && (0, _Node.isScalar)(node) ? node.value : node;else return (0, _Node.isCollection)(node) ? node.getIn(rest, keepScalar) : undefined;
    }
  }, {
    key: "hasAllNullValues",
    value: function hasAllNullValues(allowScalar) {
      return this.items.every(function (node) {
        if (!(0, _Node.isPair)(node)) return false;
        var n = node.value;
        return n == null || allowScalar && (0, _Node.isScalar)(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     */

  }, {
    key: "hasIn",
    value: function hasIn(path) {
      var _path4 = _toArray(path),
          key = _path4[0],
          rest = _path4.slice(1);

      if (rest.length === 0) return this.has(key);
      var node = this.get(key, true);
      return (0, _Node.isCollection)(node) ? node.hasIn(rest) : false;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */

  }, {
    key: "setIn",
    value: function setIn(path, value) {
      var _path5 = _toArray(path),
          key = _path5[0],
          rest = _path5.slice(1);

      if (rest.length === 0) {
        this.set(key, value);
      } else {
        var node = this.get(key, true);
        if ((0, _Node.isCollection)(node)) node.setIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error("Expected YAML collection at ".concat(key, ". Remaining path: ").concat(rest));
      }
    }
  }]);

  return Collection;
}(_Node.NodeBase);

exports.Collection = Collection;
Collection.maxFlowStringSingleLineLength = 60;

},{"../doc/createNode.js":24,"./Node.js":31}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAlias = exports.hasAnchor = exports.SEQ = exports.SCALAR = exports.PAIR = exports.NodeBase = exports.NODE_TYPE = exports.MAP = exports.DOC = exports.ALIAS = void 0;
exports.isCollection = isCollection;
exports.isMap = exports.isDocument = void 0;
exports.isNode = isNode;
exports.isSeq = exports.isScalar = exports.isPair = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var ALIAS = Symbol["for"]('yaml.alias');
exports.ALIAS = ALIAS;
var DOC = Symbol["for"]('yaml.document');
exports.DOC = DOC;
var MAP = Symbol["for"]('yaml.map');
exports.MAP = MAP;
var PAIR = Symbol["for"]('yaml.pair');
exports.PAIR = PAIR;
var SCALAR = Symbol["for"]('yaml.scalar');
exports.SCALAR = SCALAR;
var SEQ = Symbol["for"]('yaml.seq');
exports.SEQ = SEQ;
var NODE_TYPE = Symbol["for"]('yaml.node.type');
exports.NODE_TYPE = NODE_TYPE;

var isAlias = function isAlias(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === ALIAS;
};

exports.isAlias = isAlias;

var isDocument = function isDocument(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === DOC;
};

exports.isDocument = isDocument;

var isMap = function isMap(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === MAP;
};

exports.isMap = isMap;

var isPair = function isPair(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === PAIR;
};

exports.isPair = isPair;

var isScalar = function isScalar(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === SCALAR;
};

exports.isScalar = isScalar;

var isSeq = function isSeq(node) {
  return !!node && _typeof(node) === 'object' && node[NODE_TYPE] === SEQ;
};

exports.isSeq = isSeq;

function isCollection(node) {
  if (node && _typeof(node) === 'object') switch (node[NODE_TYPE]) {
    case MAP:
    case SEQ:
      return true;
  }
  return false;
}

function isNode(node) {
  if (node && _typeof(node) === 'object') switch (node[NODE_TYPE]) {
    case ALIAS:
    case MAP:
    case SCALAR:
    case SEQ:
      return true;
  }
  return false;
}

var hasAnchor = function hasAnchor(node) {
  return (isScalar(node) || isCollection(node)) && !!node.anchor;
};

exports.hasAnchor = hasAnchor;

var NodeBase = /*#__PURE__*/function () {
  function NodeBase(type) {
    _classCallCheck(this, NodeBase);

    Object.defineProperty(this, NODE_TYPE, {
      value: type
    });
  }
  /** Create a copy of this node.  */


  _createClass(NodeBase, [{
    key: "clone",
    value: function clone() {
      var copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range) copy.range = this.range.slice();
      return copy;
    }
  }]);

  return NodeBase;
}();

exports.NodeBase = NodeBase;

},{}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pair = void 0;
exports.createPair = createPair;

var _createNode = require("../doc/createNode.js");

var _stringifyPair = require("../stringify/stringifyPair.js");

var _addPairToJSMap = require("./addPairToJSMap.js");

var _Node = require("./Node.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function createPair(key, value, ctx) {
  var k = (0, _createNode.createNode)(key, undefined, ctx);
  var v = (0, _createNode.createNode)(value, undefined, ctx);
  return new Pair(k, v);
}

var Pair = /*#__PURE__*/function () {
  function Pair(key) {
    var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    _classCallCheck(this, Pair);

    Object.defineProperty(this, _Node.NODE_TYPE, {
      value: _Node.PAIR
    });
    this.key = key;
    this.value = value;
  }

  _createClass(Pair, [{
    key: "clone",
    value: function clone(schema) {
      var key = this.key,
          value = this.value;
      if ((0, _Node.isNode)(key)) key = key.clone(schema);
      if ((0, _Node.isNode)(value)) value = value.clone(schema);
      return new Pair(key, value);
    }
  }, {
    key: "toJSON",
    value: function toJSON(_, ctx) {
      var pair = ctx !== null && ctx !== void 0 && ctx.mapAsMap ? new Map() : {};
      return (0, _addPairToJSMap.addPairToJSMap)(ctx, pair, this);
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      return ctx !== null && ctx !== void 0 && ctx.doc ? (0, _stringifyPair.stringifyPair)(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }]);

  return Pair;
}();

exports.Pair = Pair;

},{"../doc/createNode.js":24,"../stringify/stringifyPair.js":72,"./Node.js":31,"./addPairToJSMap.js":36}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isScalarValue = exports.Scalar = void 0;

var _Node = require("./Node.js");

var _toJS = require("./toJS.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var isScalarValue = function isScalarValue(value) {
  return !value || typeof value !== 'function' && _typeof(value) !== 'object';
};

exports.isScalarValue = isScalarValue;

var Scalar = /*#__PURE__*/function (_NodeBase) {
  _inherits(Scalar, _NodeBase);

  var _super = _createSuper(Scalar);

  function Scalar(value) {
    var _this;

    _classCallCheck(this, Scalar);

    _this = _super.call(this, _Node.SCALAR);
    _this.value = value;
    return _this;
  }

  _createClass(Scalar, [{
    key: "toJSON",
    value: function toJSON(arg, ctx) {
      return ctx !== null && ctx !== void 0 && ctx.keep ? this.value : (0, _toJS.toJS)(this.value, arg, ctx);
    }
  }, {
    key: "toString",
    value: function toString() {
      return String(this.value);
    }
  }]);

  return Scalar;
}(_Node.NodeBase);

exports.Scalar = Scalar;
Scalar.BLOCK_FOLDED = 'BLOCK_FOLDED';
Scalar.BLOCK_LITERAL = 'BLOCK_LITERAL';
Scalar.PLAIN = 'PLAIN';
Scalar.QUOTE_DOUBLE = 'QUOTE_DOUBLE';
Scalar.QUOTE_SINGLE = 'QUOTE_SINGLE';

},{"./Node.js":31,"./toJS.js":37}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.YAMLMap = void 0;
exports.findPair = findPair;

var _stringifyCollection = require("../stringify/stringifyCollection.js");

var _addPairToJSMap = require("./addPairToJSMap.js");

var _Collection2 = require("./Collection.js");

var _Node = require("./Node.js");

var _Pair = require("./Pair.js");

var _Scalar = require("./Scalar.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function findPair(items, key) {
  var k = (0, _Node.isScalar)(key) ? key.value : key;

  var _iterator = _createForOfIteratorHelper(items),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var it = _step.value;

      if ((0, _Node.isPair)(it)) {
        if (it.key === key || it.key === k) return it;
        if ((0, _Node.isScalar)(it.key) && it.key.value === k) return it;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return undefined;
}

var YAMLMap = /*#__PURE__*/function (_Collection) {
  _inherits(YAMLMap, _Collection);

  var _super = _createSuper(YAMLMap);

  function YAMLMap(schema) {
    var _this;

    _classCallCheck(this, YAMLMap);

    _this = _super.call(this, _Node.MAP, schema);
    _this.items = [];
    return _this;
  }

  _createClass(YAMLMap, [{
    key: "add",
    value:
    /**
     * Adds a value to the collection.
     *
     * @param overwrite - If not set `true`, using a key that is already in the
     *   collection will throw. Otherwise, overwrites the previous value.
     */
    function add(pair, overwrite) {
      var _this$schema;

      var _pair;

      if ((0, _Node.isPair)(pair)) _pair = pair;else if (!pair || _typeof(pair) !== 'object' || !('key' in pair)) {
        // In TypeScript, this never happens.
        _pair = new _Pair.Pair(pair, pair === null || pair === void 0 ? void 0 : pair.value);
      } else _pair = new _Pair.Pair(pair.key, pair.value);
      var prev = findPair(this.items, _pair.key);
      var sortEntries = (_this$schema = this.schema) === null || _this$schema === void 0 ? void 0 : _this$schema.sortMapEntries;

      if (prev) {
        if (!overwrite) throw new Error("Key ".concat(_pair.key, " already set")); // For scalars, keep the old node & its comments and anchors

        if ((0, _Node.isScalar)(prev.value) && (0, _Scalar.isScalarValue)(_pair.value)) prev.value.value = _pair.value;else prev.value = _pair.value;
      } else if (sortEntries) {
        var i = this.items.findIndex(function (item) {
          return sortEntries(_pair, item) < 0;
        });
        if (i === -1) this.items.push(_pair);else this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      var it = findPair(this.items, key);
      if (!it) return false;
      var del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      var _ref;

      var it = findPair(this.items, key);
      var node = it === null || it === void 0 ? void 0 : it.value;
      return (_ref = !keepScalar && (0, _Node.isScalar)(node) ? node.value : node) !== null && _ref !== void 0 ? _ref : undefined;
    }
  }, {
    key: "has",
    value: function has(key) {
      return !!findPair(this.items, key);
    }
  }, {
    key: "set",
    value: function set(key, value) {
      this.add(new _Pair.Pair(key, value), true);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */

  }, {
    key: "toJSON",
    value: function toJSON(_, ctx, Type) {
      var map = Type ? new Type() : ctx !== null && ctx !== void 0 && ctx.mapAsMap ? new Map() : {};
      if (ctx !== null && ctx !== void 0 && ctx.onCreate) ctx.onCreate(map);

      var _iterator2 = _createForOfIteratorHelper(this.items),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var item = _step2.value;
          (0, _addPairToJSMap.addPairToJSMap)(ctx, map, item);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return map;
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);

      var _iterator3 = _createForOfIteratorHelper(this.items),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var item = _step3.value;
          if (!(0, _Node.isPair)(item)) throw new Error("Map items must all be pairs; found ".concat(JSON.stringify(item), " instead"));
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      if (!ctx.allNullValues && this.hasAllNullValues(false)) ctx = Object.assign({}, ctx, {
        allNullValues: true
      });
      return (0, _stringifyCollection.stringifyCollection)(this, ctx, {
        blockItemPrefix: '',
        flowChars: {
          start: '{',
          end: '}'
        },
        itemIndent: ctx.indent || '',
        onChompKeep: onChompKeep,
        onComment: onComment
      });
    }
  }], [{
    key: "tagName",
    get: function get() {
      return 'tag:yaml.org,2002:map';
    }
  }]);

  return YAMLMap;
}(_Collection2.Collection);

exports.YAMLMap = YAMLMap;

},{"../stringify/stringifyCollection.js":68,"./Collection.js":30,"./Node.js":31,"./Pair.js":32,"./Scalar.js":33,"./addPairToJSMap.js":36}],35:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.YAMLSeq = void 0;

var _stringifyCollection = require("../stringify/stringifyCollection.js");

var _Collection2 = require("./Collection.js");

var _Node = require("./Node.js");

var _Scalar = require("./Scalar.js");

var _toJS = require("./toJS.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var YAMLSeq = /*#__PURE__*/function (_Collection) {
  _inherits(YAMLSeq, _Collection);

  var _super = _createSuper(YAMLSeq);

  function YAMLSeq(schema) {
    var _this;

    _classCallCheck(this, YAMLSeq);

    _this = _super.call(this, _Node.SEQ, schema);
    _this.items = [];
    return _this;
  }

  _createClass(YAMLSeq, [{
    key: "add",
    value: function add(value) {
      this.items.push(value);
    }
    /**
     * Removes a value from the collection.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     *
     * @returns `true` if the item was found and removed.
     */

  }, {
    key: "delete",
    value: function _delete(key) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') return false;
      var del = this.items.splice(idx, 1);
      return del.length > 0;
    }
  }, {
    key: "get",
    value: function get(key, keepScalar) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') return undefined;
      var it = this.items[idx];
      return !keepScalar && (0, _Node.isScalar)(it) ? it.value : it;
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     */

  }, {
    key: "has",
    value: function has(key) {
      var idx = asItemIndex(key);
      return typeof idx === 'number' && idx < this.items.length;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     *
     * If `key` does not contain a representation of an integer, this will throw.
     * It may be wrapped in a `Scalar`.
     */

  }, {
    key: "set",
    value: function set(key, value) {
      var idx = asItemIndex(key);
      if (typeof idx !== 'number') throw new Error("Expected a valid index, not ".concat(key, "."));
      var prev = this.items[idx];
      if ((0, _Node.isScalar)(prev) && (0, _Scalar.isScalarValue)(value)) prev.value = value;else this.items[idx] = value;
    }
  }, {
    key: "toJSON",
    value: function toJSON(_, ctx) {
      var seq = [];
      if (ctx !== null && ctx !== void 0 && ctx.onCreate) ctx.onCreate(seq);
      var i = 0;

      var _iterator = _createForOfIteratorHelper(this.items),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var item = _step.value;
          seq.push((0, _toJS.toJS)(item, String(i++), ctx));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return seq;
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      return (0, _stringifyCollection.stringifyCollection)(this, ctx, {
        blockItemPrefix: '- ',
        flowChars: {
          start: '[',
          end: ']'
        },
        itemIndent: (ctx.indent || '') + '  ',
        onChompKeep: onChompKeep,
        onComment: onComment
      });
    }
  }], [{
    key: "tagName",
    get: function get() {
      return 'tag:yaml.org,2002:seq';
    }
  }]);

  return YAMLSeq;
}(_Collection2.Collection);

exports.YAMLSeq = YAMLSeq;

function asItemIndex(key) {
  var idx = (0, _Node.isScalar)(key) ? key.value : key;
  if (idx && typeof idx === 'string') idx = Number(idx);
  return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 ? idx : null;
}

},{"../stringify/stringifyCollection.js":68,"./Collection.js":30,"./Node.js":31,"./Scalar.js":33,"./toJS.js":37}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addPairToJSMap = addPairToJSMap;

var _log = require("../log.js");

var _stringify = require("../stringify/stringify.js");

var _Node = require("./Node.js");

var _Scalar = require("./Scalar.js");

var _toJS = require("./toJS.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var MERGE_KEY = '<<';

function addPairToJSMap(ctx, map, _ref) {
  var key = _ref.key,
      value = _ref.value;

  if (ctx !== null && ctx !== void 0 && ctx.doc.schema.merge && isMergeKey(key)) {
    value = (0, _Node.isAlias)(value) ? value.resolve(ctx.doc) : value;

    if ((0, _Node.isSeq)(value)) {
      var _iterator = _createForOfIteratorHelper(value.items),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var it = _step.value;
          mergeToJSMap(ctx, map, it);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } else if (Array.isArray(value)) {
      var _iterator2 = _createForOfIteratorHelper(value),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var _it = _step2.value;
          mergeToJSMap(ctx, map, _it);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    } else mergeToJSMap(ctx, map, value);
  } else {
    var jsKey = (0, _toJS.toJS)(key, '', ctx);

    if (map instanceof Map) {
      map.set(jsKey, (0, _toJS.toJS)(value, jsKey, ctx));
    } else if (map instanceof Set) {
      map.add(jsKey);
    } else {
      var stringKey = stringifyKey(key, jsKey, ctx);
      var jsValue = (0, _toJS.toJS)(value, stringKey, ctx);
      if (stringKey in map) Object.defineProperty(map, stringKey, {
        value: jsValue,
        writable: true,
        enumerable: true,
        configurable: true
      });else map[stringKey] = jsValue;
    }
  }

  return map;
}

var isMergeKey = function isMergeKey(key) {
  return key === MERGE_KEY || (0, _Node.isScalar)(key) && key.value === MERGE_KEY && (!key.type || key.type === _Scalar.Scalar.PLAIN);
}; // If the value associated with a merge key is a single mapping node, each of
// its key/value pairs is inserted into the current mapping, unless the key
// already exists in it. If the value associated with the merge key is a
// sequence, then this sequence is expected to contain mapping nodes and each
// of these nodes is merged in turn according to its order in the sequence.
// Keys in mapping nodes earlier in the sequence override keys specified in
// later mapping nodes. -- http://yaml.org/type/merge.html


function mergeToJSMap(ctx, map, value) {
  var source = ctx && (0, _Node.isAlias)(value) ? value.resolve(ctx.doc) : value;
  if (!(0, _Node.isMap)(source)) throw new Error('Merge sources must be maps or map aliases');
  var srcMap = source.toJSON(null, ctx, Map);

  var _iterator3 = _createForOfIteratorHelper(srcMap),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var _step3$value = _slicedToArray(_step3.value, 2),
          key = _step3$value[0],
          _value = _step3$value[1];

      if (map instanceof Map) {
        if (!map.has(key)) map.set(key, _value);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value: _value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }

  return map;
}

function stringifyKey(key, jsKey, ctx) {
  if (jsKey === null) return '';
  if (_typeof(jsKey) !== 'object') return String(jsKey);

  if ((0, _Node.isNode)(key) && ctx && ctx.doc) {
    var strCtx = (0, _stringify.createStringifyContext)(ctx.doc, {});
    strCtx.anchors = new Set();

    var _iterator4 = _createForOfIteratorHelper(ctx.anchors.keys()),
        _step4;

    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var node = _step4.value;
        strCtx.anchors.add(node.anchor);
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }

    strCtx.inFlow = true;
    strCtx.inStringifyKey = true;
    var strKey = key.toString(strCtx);

    if (!ctx.mapKeyWarned) {
      var jsonStr = JSON.stringify(strKey);
      if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + '..."';
      (0, _log.warn)(ctx.doc.options.logLevel, "Keys with collection values will be stringified due to JS Object restrictions: ".concat(jsonStr, ". Set mapAsMap: true to use object keys."));
      ctx.mapKeyWarned = true;
    }

    return strKey;
  }

  return JSON.stringify(jsKey);
}

},{"../log.js":28,"../stringify/stringify.js":67,"./Node.js":31,"./Scalar.js":33,"./toJS.js":37}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toJS = toJS;

var _Node = require("./Node.js");

/**
 * Recursively convert any node or its contents to native JavaScript
 *
 * @param value - The input value
 * @param arg - If `value` defines a `toJSON()` method, use this
 *   as its first argument
 * @param ctx - Conversion context, originally set in Document#toJS(). If
 *   `{ keep: true }` is not set, output should be suitable for JSON
 *   stringification.
 */
function toJS(value, arg, ctx) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (Array.isArray(value)) return value.map(function (v, i) {
    return toJS(v, String(i), ctx);
  });

  if (value && typeof value.toJSON === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (!ctx || !(0, _Node.hasAnchor)(value)) return value.toJSON(arg, ctx);
    var data = {
      aliasCount: 0,
      count: 1,
      res: undefined
    };
    ctx.anchors.set(value, data);

    ctx.onCreate = function (res) {
      data.res = res;
      delete ctx.onCreate;
    };

    var res = value.toJSON(arg, ctx);
    if (ctx.onCreate) ctx.onCreate(res);
    return res;
  }

  if (typeof value === 'bigint' && !(ctx !== null && ctx !== void 0 && ctx.keep)) return Number(value);
  return value;
}

},{"./Node.js":31}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createScalarToken = createScalarToken;
exports.resolveAsScalar = resolveAsScalar;
exports.setScalarValue = setScalarValue;

var _resolveBlockScalar = require("../compose/resolve-block-scalar.js");

var _resolveFlowScalar = require("../compose/resolve-flow-scalar.js");

var _errors = require("../errors.js");

var _stringifyString = require("../stringify/stringifyString.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function resolveAsScalar(token) {
  var strict = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var onError = arguments.length > 2 ? arguments[2] : undefined;

  if (token) {
    var _onError = function _onError(pos, code, message) {
      var offset = typeof pos === 'number' ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
      if (onError) onError(offset, code, message);else throw new _errors.YAMLParseError([offset, offset + 1], code, message);
    };

    switch (token.type) {
      case 'scalar':
      case 'single-quoted-scalar':
      case 'double-quoted-scalar':
        return (0, _resolveFlowScalar.resolveFlowScalar)(token, strict, _onError);

      case 'block-scalar':
        return (0, _resolveBlockScalar.resolveBlockScalar)(token, strict, _onError);
    }
  }

  return null;
}
/**
 * Create a new scalar token with `value`
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.end Comments and whitespace after the end of the value, or after the block scalar header. If undefined, a newline will be added.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.indent The indent level of the token.
 * @param context.inFlow Is this scalar within a flow collection? This may affect the resolved type of the token's value.
 * @param context.offset The offset position of the token.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */


function createScalarToken(value, context) {
  var _context$end;

  var _context$implicitKey = context.implicitKey,
      implicitKey = _context$implicitKey === void 0 ? false : _context$implicitKey,
      indent = context.indent,
      _context$inFlow = context.inFlow,
      inFlow = _context$inFlow === void 0 ? false : _context$inFlow,
      _context$offset = context.offset,
      offset = _context$offset === void 0 ? -1 : _context$offset,
      _context$type = context.type,
      type = _context$type === void 0 ? 'PLAIN' : _context$type;
  var source = (0, _stringifyString.stringifyString)({
    type: type,
    value: value
  }, {
    implicitKey: implicitKey,
    indent: indent > 0 ? ' '.repeat(indent) : '',
    inFlow: inFlow,
    options: {
      blockQuote: true,
      lineWidth: -1
    }
  });
  var end = (_context$end = context.end) !== null && _context$end !== void 0 ? _context$end : [{
    type: 'newline',
    offset: -1,
    indent: indent,
    source: '\n'
  }];

  switch (source[0]) {
    case '|':
    case '>':
      {
        var he = source.indexOf('\n');
        var head = source.substring(0, he);
        var body = source.substring(he + 1) + '\n';
        var props = [{
          type: 'block-scalar-header',
          offset: offset,
          indent: indent,
          source: head
        }];
        if (!addEndtoBlockProps(props, end)) props.push({
          type: 'newline',
          offset: -1,
          indent: indent,
          source: '\n'
        });
        return {
          type: 'block-scalar',
          offset: offset,
          indent: indent,
          props: props,
          source: body
        };
      }

    case '"':
      return {
        type: 'double-quoted-scalar',
        offset: offset,
        indent: indent,
        source: source,
        end: end
      };

    case "'":
      return {
        type: 'single-quoted-scalar',
        offset: offset,
        indent: indent,
        source: source,
        end: end
      };

    default:
      return {
        type: 'scalar',
        offset: offset,
        indent: indent,
        source: source,
        end: end
      };
  }
}
/**
 * Set the value of `token` to the given string `value`, overwriting any previous contents and type that it may have.
 *
 * Best efforts are made to retain any comments previously associated with the `token`,
 * though all contents within a collection's `items` will be overwritten.
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param token Any token. If it does not include an `indent` value, the value will be stringified as if it were an implicit key.
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.afterKey In most cases, values after a key should have an additional level of indentation.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.inFlow Being within a flow collection may affect the resolved type of the token's value.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */


function setScalarValue(token, value) {
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _context$afterKey = context.afterKey,
      afterKey = _context$afterKey === void 0 ? false : _context$afterKey,
      _context$implicitKey2 = context.implicitKey,
      implicitKey = _context$implicitKey2 === void 0 ? false : _context$implicitKey2,
      _context$inFlow2 = context.inFlow,
      inFlow = _context$inFlow2 === void 0 ? false : _context$inFlow2,
      type = context.type;
  var indent = 'indent' in token ? token.indent : null;
  if (afterKey && typeof indent === 'number') indent += 2;
  if (!type) switch (token.type) {
    case 'single-quoted-scalar':
      type = 'QUOTE_SINGLE';
      break;

    case 'double-quoted-scalar':
      type = 'QUOTE_DOUBLE';
      break;

    case 'block-scalar':
      {
        var header = token.props[0];
        if (header.type !== 'block-scalar-header') throw new Error('Invalid block scalar header');
        type = header.source[0] === '>' ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
        break;
      }

    default:
      type = 'PLAIN';
  }
  var source = (0, _stringifyString.stringifyString)({
    type: type,
    value: value
  }, {
    implicitKey: implicitKey || indent === null,
    indent: indent !== null && indent > 0 ? ' '.repeat(indent) : '',
    inFlow: inFlow,
    options: {
      blockQuote: true,
      lineWidth: -1
    }
  });

  switch (source[0]) {
    case '|':
    case '>':
      setBlockScalarValue(token, source);
      break;

    case '"':
      setFlowScalarValue(token, source, 'double-quoted-scalar');
      break;

    case "'":
      setFlowScalarValue(token, source, 'single-quoted-scalar');
      break;

    default:
      setFlowScalarValue(token, source, 'scalar');
  }
}

function setBlockScalarValue(token, source) {
  var he = source.indexOf('\n');
  var head = source.substring(0, he);
  var body = source.substring(he + 1) + '\n';

  if (token.type === 'block-scalar') {
    var header = token.props[0];
    if (header.type !== 'block-scalar-header') throw new Error('Invalid block scalar header');
    header.source = head;
    token.source = body;
  } else {
    var offset = token.offset;
    var indent = 'indent' in token ? token.indent : -1;
    var props = [{
      type: 'block-scalar-header',
      offset: offset,
      indent: indent,
      source: head
    }];
    if (!addEndtoBlockProps(props, 'end' in token ? token.end : undefined)) props.push({
      type: 'newline',
      offset: -1,
      indent: indent,
      source: '\n'
    });

    for (var _i = 0, _Object$keys = Object.keys(token); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      if (key !== 'type' && key !== 'offset') delete token[key];
    }

    Object.assign(token, {
      type: 'block-scalar',
      indent: indent,
      props: props,
      source: body
    });
  }
}
/** @returns `true` if last token is a newline */


function addEndtoBlockProps(props, end) {
  if (end) {
    var _iterator = _createForOfIteratorHelper(end),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var st = _step.value;

        switch (st.type) {
          case 'space':
          case 'comment':
            props.push(st);
            break;

          case 'newline':
            props.push(st);
            return true;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return false;
}

function setFlowScalarValue(token, source, type) {
  switch (token.type) {
    case 'scalar':
    case 'double-quoted-scalar':
    case 'single-quoted-scalar':
      token.type = type;
      token.source = source;
      break;

    case 'block-scalar':
      {
        var end = token.props.slice(1);
        var oa = source.length;
        if (token.props[0].type === 'block-scalar-header') oa -= token.props[0].source.length;

        var _iterator2 = _createForOfIteratorHelper(end),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var tok = _step2.value;
            tok.offset += oa;
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        delete token.props;
        Object.assign(token, {
          type: type,
          source: source,
          end: end
        });
        break;
      }

    case 'block-map':
    case 'block-seq':
      {
        var offset = token.offset + source.length;
        var nl = {
          type: 'newline',
          offset: offset,
          indent: token.indent,
          source: '\n'
        };
        delete token.items;
        Object.assign(token, {
          type: type,
          source: source,
          end: [nl]
        });
        break;
      }

    default:
      {
        var indent = 'indent' in token ? token.indent : -1;

        var _end = 'end' in token && Array.isArray(token.end) ? token.end.filter(function (st) {
          return st.type === 'space' || st.type === 'comment' || st.type === 'newline';
        }) : [];

        for (var _i2 = 0, _Object$keys2 = Object.keys(token); _i2 < _Object$keys2.length; _i2++) {
          var key = _Object$keys2[_i2];
          if (key !== 'type' && key !== 'offset') delete token[key];
        }

        Object.assign(token, {
          type: type,
          indent: indent,
          source: source,
          end: _end
        });
      }
  }
}

},{"../compose/resolve-block-scalar.js":11,"../compose/resolve-flow-scalar.js":15,"../errors.js":26,"../stringify/stringifyString.js":73}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringify = void 0;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * Stringify a CST document, token, or collection item
 *
 * Fair warning: This applies no validation whatsoever, and
 * simply concatenates the sources in their logical order.
 */
var stringify = function stringify(cst) {
  return 'type' in cst ? stringifyToken(cst) : stringifyItem(cst);
};

exports.stringify = stringify;

function stringifyToken(token) {
  switch (token.type) {
    case 'block-scalar':
      {
        var res = '';

        var _iterator = _createForOfIteratorHelper(token.props),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var tok = _step.value;
            res += stringifyToken(tok);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return res + token.source;
      }

    case 'block-map':
    case 'block-seq':
      {
        var _res = '';

        var _iterator2 = _createForOfIteratorHelper(token.items),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var item = _step2.value;
            _res += stringifyItem(item);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        return _res;
      }

    case 'flow-collection':
      {
        var _res2 = token.start.source;

        var _iterator3 = _createForOfIteratorHelper(token.items),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var _item = _step3.value;
            _res2 += stringifyItem(_item);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        var _iterator4 = _createForOfIteratorHelper(token.end),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var st = _step4.value;
            _res2 += st.source;
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }

        return _res2;
      }

    case 'document':
      {
        var _res3 = stringifyItem(token);

        if (token.end) {
          var _iterator5 = _createForOfIteratorHelper(token.end),
              _step5;

          try {
            for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
              var _st = _step5.value;
              _res3 += _st.source;
            }
          } catch (err) {
            _iterator5.e(err);
          } finally {
            _iterator5.f();
          }
        }

        return _res3;
      }

    default:
      {
        var _res4 = token.source;

        if ('end' in token && token.end) {
          var _iterator6 = _createForOfIteratorHelper(token.end),
              _step6;

          try {
            for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
              var _st2 = _step6.value;
              _res4 += _st2.source;
            }
          } catch (err) {
            _iterator6.e(err);
          } finally {
            _iterator6.f();
          }
        }

        return _res4;
      }
  }
}

function stringifyItem(_ref) {
  var start = _ref.start,
      key = _ref.key,
      sep = _ref.sep,
      value = _ref.value;
  var res = '';

  var _iterator7 = _createForOfIteratorHelper(start),
      _step7;

  try {
    for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
      var _st3 = _step7.value;
      res += _st3.source;
    }
  } catch (err) {
    _iterator7.e(err);
  } finally {
    _iterator7.f();
  }

  if (key) res += stringifyToken(key);

  if (sep) {
    var _iterator8 = _createForOfIteratorHelper(sep),
        _step8;

    try {
      for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
        var st = _step8.value;
        res += st.source;
      }
    } catch (err) {
      _iterator8.e(err);
    } finally {
      _iterator8.f();
    }
  }

  if (value) res += stringifyToken(value);
  return res;
}

},{}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.visit = visit;

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var BREAK = Symbol('break visit');
var SKIP = Symbol('skip children');
var REMOVE = Symbol('remove item');
/**
 * Apply a visitor to a CST document or item.
 *
 * Walks through the tree (depth-first) starting from the root, calling a
 * `visitor` function with two arguments when entering each item:
 *   - `item`: The current item, which included the following members:
 *     - `start: SourceToken[]` – Source tokens before the key or value,
 *       possibly including its anchor or tag.
 *     - `key?: Token | null` – Set for pair values. May then be `null`, if
 *       the key before the `:` separator is empty.
 *     - `sep?: SourceToken[]` – Source tokens between the key and the value,
 *       which should include the `:` map value indicator if `value` is set.
 *     - `value?: Token` – The value of a sequence item, or of a map pair.
 *   - `path`: The steps from the root to the current node, as an array of
 *     `['key' | 'value', number]` tuples.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this token, continue with
 *      next sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current item, then continue with the next one
 *   - `number`: Set the index of the next step. This is useful especially if
 *     the index of the current token has changed.
 *   - `function`: Define the next visitor for this item. After the original
 *     visitor is called on item entry, next visitors are called after handling
 *     a non-empty `key` and when exiting the item.
 */

function visit(cst, visitor) {
  if ('type' in cst && cst.type === 'document') cst = {
    start: cst.start,
    value: cst.value
  };

  _visit(Object.freeze([]), cst, visitor);
} // Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.

/** Terminate visit traversal completely */


visit.BREAK = BREAK;
/** Do not visit the children of the current item */

visit.SKIP = SKIP;
/** Remove the current item */

visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */

visit.itemAtPath = function (cst, path) {
  var item = cst;

  var _iterator = _createForOfIteratorHelper(path),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _item;

      var _step$value = _slicedToArray(_step.value, 2),
          field = _step$value[0],
          index = _step$value[1];

      var tok = (_item = item) === null || _item === void 0 ? void 0 : _item[field];

      if (tok && 'items' in tok) {
        item = tok.items[index];
      } else return undefined;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return item;
};
/**
 * Get the immediate parent collection of the item at `path` from `cst` as the root.
 *
 * Throws an error if the collection is not found, which should never happen if the item itself exists.
 */


visit.parentCollection = function (cst, path) {
  var parent = visit.itemAtPath(cst, path.slice(0, -1));
  var field = path[path.length - 1][0];
  var coll = parent === null || parent === void 0 ? void 0 : parent[field];
  if (coll && 'items' in coll) return coll;
  throw new Error('Parent collection not found');
};

function _visit(path, item, visitor) {
  var ctrl = visitor(item, path);
  if (_typeof(ctrl) === 'symbol') return ctrl;

  for (var _i2 = 0, _arr2 = ['key', 'value']; _i2 < _arr2.length; _i2++) {
    var field = _arr2[_i2];
    var token = item[field];

    if (token && 'items' in token) {
      for (var i = 0; i < token.items.length; ++i) {
        var ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);

        if (typeof ci === 'number') i = ci - 1;else if (ci === BREAK) return BREAK;else if (ci === REMOVE) {
          token.items.splice(i, 1);
          i -= 1;
        }
      }

      if (typeof ctrl === 'function' && field === 'key') ctrl = ctrl(item, path);
    }
  }

  return typeof ctrl === 'function' ? ctrl(item, path) : ctrl;
}

},{}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SCALAR = exports.FLOW_END = exports.DOCUMENT = exports.BOM = void 0;
Object.defineProperty(exports, "createScalarToken", {
  enumerable: true,
  get: function get() {
    return _cstScalar.createScalarToken;
  }
});
exports.isScalar = exports.isCollection = void 0;
exports.prettyToken = prettyToken;
Object.defineProperty(exports, "resolveAsScalar", {
  enumerable: true,
  get: function get() {
    return _cstScalar.resolveAsScalar;
  }
});
Object.defineProperty(exports, "setScalarValue", {
  enumerable: true,
  get: function get() {
    return _cstScalar.setScalarValue;
  }
});
Object.defineProperty(exports, "stringify", {
  enumerable: true,
  get: function get() {
    return _cstStringify.stringify;
  }
});
exports.tokenType = tokenType;
Object.defineProperty(exports, "visit", {
  enumerable: true,
  get: function get() {
    return _cstVisit.visit;
  }
});

var _cstScalar = require("./cst-scalar.js");

var _cstStringify = require("./cst-stringify.js");

var _cstVisit = require("./cst-visit.js");

/** The byte order mark */
var BOM = "\uFEFF";
/** Start of doc-mode */

exports.BOM = BOM;
var DOCUMENT = '\x02'; // C0: Start of Text

/** Unexpected end of flow-mode */

exports.DOCUMENT = DOCUMENT;
var FLOW_END = '\x18'; // C0: Cancel

/** Next token is a scalar value */

exports.FLOW_END = FLOW_END;
var SCALAR = '\x1f'; // C0: Unit Separator

/** @returns `true` if `token` is a flow or block collection */

exports.SCALAR = SCALAR;

var isCollection = function isCollection(token) {
  return !!token && 'items' in token;
};
/** @returns `true` if `token` is a flow or block scalar; not an alias */


exports.isCollection = isCollection;

var isScalar = function isScalar(token) {
  return !!token && (token.type === 'scalar' || token.type === 'single-quoted-scalar' || token.type === 'double-quoted-scalar' || token.type === 'block-scalar');
};
/* istanbul ignore next */

/** Get a printable representation of a lexer token */


exports.isScalar = isScalar;

function prettyToken(token) {
  switch (token) {
    case BOM:
      return '<BOM>';

    case DOCUMENT:
      return '<DOC>';

    case FLOW_END:
      return '<FLOW_END>';

    case SCALAR:
      return '<SCALAR>';

    default:
      return JSON.stringify(token);
  }
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */


function tokenType(source) {
  switch (source) {
    case BOM:
      return 'byte-order-mark';

    case DOCUMENT:
      return 'doc-mode';

    case FLOW_END:
      return 'flow-error-end';

    case SCALAR:
      return 'scalar';

    case '---':
      return 'doc-start';

    case '...':
      return 'doc-end';

    case '':
    case '\n':
    case '\r\n':
      return 'newline';

    case '-':
      return 'seq-item-ind';

    case '?':
      return 'explicit-key-ind';

    case ':':
      return 'map-value-ind';

    case '{':
      return 'flow-map-start';

    case '}':
      return 'flow-map-end';

    case '[':
      return 'flow-seq-start';

    case ']':
      return 'flow-seq-end';

    case ',':
      return 'comma';
  }

  switch (source[0]) {
    case ' ':
    case '\t':
      return 'space';

    case '#':
      return 'comment';

    case '%':
      return 'directive-line';

    case '*':
      return 'alias';

    case '&':
      return 'anchor';

    case '!':
      return 'tag';

    case "'":
      return 'single-quoted-scalar';

    case '"':
      return 'double-quoted-scalar';

    case '|':
    case '>':
      return 'block-scalar-header';
  }

  return null;
}

},{"./cst-scalar.js":38,"./cst-stringify.js":39,"./cst-visit.js":40}],42:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Lexer = void 0;

var _cst = require("./cst.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

/*
START -> stream

stream
  directive -> line-end -> stream
  indent + line-end -> stream
  [else] -> line-start

line-end
  comment -> line-end
  newline -> .
  input-end -> END

line-start
  doc-start -> doc
  doc-end -> stream
  [else] -> indent -> block-start

block-start
  seq-item-start -> block-start
  explicit-key-start -> block-start
  map-value-start -> block-start
  [else] -> doc

doc
  line-end -> line-start
  spaces -> doc
  anchor -> doc
  tag -> doc
  flow-start -> flow -> doc
  flow-end -> error -> doc
  seq-item-start -> error -> doc
  explicit-key-start -> error -> doc
  map-value-start -> doc
  alias -> doc
  quote-start -> quoted-scalar -> doc
  block-scalar-header -> line-end -> block-scalar(min) -> line-start
  [else] -> plain-scalar(false, min) -> doc

flow
  line-end -> flow
  spaces -> flow
  anchor -> flow
  tag -> flow
  flow-start -> flow -> flow
  flow-end -> .
  seq-item-start -> error -> flow
  explicit-key-start -> flow
  map-value-start -> flow
  alias -> flow
  quote-start -> quoted-scalar -> flow
  comma -> flow
  [else] -> plain-scalar(true, 0) -> flow

quoted-scalar
  quote-end -> .
  [else] -> quoted-scalar

block-scalar(min)
  newline + peek(indent < min) -> .
  [else] -> block-scalar(min)

plain-scalar(is-flow, min)
  scalar-end(is-flow) -> .
  peek(newline + (indent < min)) -> .
  [else] -> plain-scalar(min)
*/
function isEmpty(ch) {
  switch (ch) {
    case undefined:
    case ' ':
    case '\n':
    case '\r':
    case '\t':
      return true;

    default:
      return false;
  }
}

var hexDigits = '0123456789ABCDEFabcdef'.split('');
var tagChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()".split('');
var invalidFlowScalarChars = ',[]{}'.split('');
var invalidAnchorChars = ' ,[]{}\n\r\t'.split('');

var isNotAnchorChar = function isNotAnchorChar(ch) {
  return !ch || invalidAnchorChars.includes(ch);
};
/**
 * Splits an input string into lexical tokens, i.e. smaller strings that are
 * easily identifiable by `tokens.tokenType()`.
 *
 * Lexing starts always in a "stream" context. Incomplete input may be buffered
 * until a complete token can be emitted.
 *
 * In addition to slices of the original input, the following control characters
 * may also be emitted:
 *
 * - `\x02` (Start of Text): A document starts with the next token
 * - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
 * - `\x1f` (Unit Separator): Next token is a scalar value
 * - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
 */


var Lexer = /*#__PURE__*/function () {
  function Lexer() {
    _classCallCheck(this, Lexer);

    /**
     * Flag indicating whether the end of the current buffer marks the end of
     * all input
     */
    this.atEnd = false;
    /**
     * Explicit indent set in block scalar header, as an offset from the current
     * minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
     * explicitly set.
     */

    this.blockScalarIndent = -1;
    /**
     * Block scalars that include a + (keep) chomping indicator in their header
     * include trailing empty lines, which are otherwise excluded from the
     * scalar's contents.
     */

    this.blockScalarKeep = false;
    /** Current input */

    this.buffer = '';
    /**
     * Flag noting whether the map value indicator : can immediately follow this
     * node within a flow context.
     */

    this.flowKey = false;
    /** Count of surrounding flow collection levels. */

    this.flowLevel = 0;
    /**
     * Minimum level of indentation required for next lines to be parsed as a
     * part of the current scalar value.
     */

    this.indentNext = 0;
    /** Indentation level of the current line. */

    this.indentValue = 0;
    /** Position of the next \n character. */

    this.lineEndPos = null;
    /** Stores the state of the lexer if reaching the end of incpomplete input */

    this.next = null;
    /** A pointer to `buffer`; the current position of the lexer. */

    this.pos = 0;
  }
  /**
   * Generate YAML tokens from the `source` string. If `incomplete`,
   * a part of the last line may be left as a buffer for the next call.
   *
   * @returns A generator of lexical tokens
   */


  _createClass(Lexer, [{
    key: "lex",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function lex(source) {
      var _this$next;

      var incomplete,
          next,
          _args = arguments;
      return _regeneratorRuntime().wrap(function lex$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              incomplete = _args.length > 1 && _args[1] !== undefined ? _args[1] : false;

              if (source) {
                this.buffer = this.buffer ? this.buffer + source : source;
                this.lineEndPos = null;
              }

              this.atEnd = !incomplete;
              next = (_this$next = this.next) !== null && _this$next !== void 0 ? _this$next : 'stream';

            case 4:
              if (!(next && (incomplete || this.hasChars(1)))) {
                _context.next = 9;
                break;
              }

              return _context.delegateYield(this.parseNext(next), "t0", 6);

            case 6:
              next = _context.t0;
              _context.next = 4;
              break;

            case 9:
            case "end":
              return _context.stop();
          }
        }
      }, lex, this);
    })
  }, {
    key: "atLineEnd",
    value: function atLineEnd() {
      var i = this.pos;
      var ch = this.buffer[i];

      while (ch === ' ' || ch === '\t') {
        ch = this.buffer[++i];
      }

      if (!ch || ch === '#' || ch === '\n') return true;
      if (ch === '\r') return this.buffer[i + 1] === '\n';
      return false;
    }
  }, {
    key: "charAt",
    value: function charAt(n) {
      return this.buffer[this.pos + n];
    }
  }, {
    key: "continueScalar",
    value: function continueScalar(offset) {
      var ch = this.buffer[offset];

      if (this.indentNext > 0) {
        var indent = 0;

        while (ch === ' ') {
          ch = this.buffer[++indent + offset];
        }

        if (ch === '\r') {
          var next = this.buffer[indent + offset + 1];
          if (next === '\n' || !next && !this.atEnd) return offset + indent + 1;
        }

        return ch === '\n' || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }

      if (ch === '-' || ch === '.') {
        var dt = this.buffer.substr(offset, 3);
        if ((dt === '---' || dt === '...') && isEmpty(this.buffer[offset + 3])) return -1;
      }

      return offset;
    }
  }, {
    key: "getLine",
    value: function getLine() {
      var end = this.lineEndPos;

      if (typeof end !== 'number' || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf('\n', this.pos);
        this.lineEndPos = end;
      }

      if (end === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === '\r') end -= 1;
      return this.buffer.substring(this.pos, end);
    }
  }, {
    key: "hasChars",
    value: function hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
  }, {
    key: "setNext",
    value: function setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
  }, {
    key: "peek",
    value: function peek(n) {
      return this.buffer.substr(this.pos, n);
    }
  }, {
    key: "parseNext",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseNext(next) {
      return _regeneratorRuntime().wrap(function parseNext$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.t0 = next;
              _context2.next = _context2.t0 === 'stream' ? 3 : _context2.t0 === 'line-start' ? 5 : _context2.t0 === 'block-start' ? 7 : _context2.t0 === 'doc' ? 9 : _context2.t0 === 'flow' ? 11 : _context2.t0 === 'quoted-scalar' ? 13 : _context2.t0 === 'block-scalar' ? 15 : _context2.t0 === 'plain-scalar' ? 17 : 19;
              break;

            case 3:
              return _context2.delegateYield(this.parseStream(), "t1", 4);

            case 4:
              return _context2.abrupt("return", _context2.t1);

            case 5:
              return _context2.delegateYield(this.parseLineStart(), "t2", 6);

            case 6:
              return _context2.abrupt("return", _context2.t2);

            case 7:
              return _context2.delegateYield(this.parseBlockStart(), "t3", 8);

            case 8:
              return _context2.abrupt("return", _context2.t3);

            case 9:
              return _context2.delegateYield(this.parseDocument(), "t4", 10);

            case 10:
              return _context2.abrupt("return", _context2.t4);

            case 11:
              return _context2.delegateYield(this.parseFlowCollection(), "t5", 12);

            case 12:
              return _context2.abrupt("return", _context2.t5);

            case 13:
              return _context2.delegateYield(this.parseQuotedScalar(), "t6", 14);

            case 14:
              return _context2.abrupt("return", _context2.t6);

            case 15:
              return _context2.delegateYield(this.parseBlockScalar(), "t7", 16);

            case 16:
              return _context2.abrupt("return", _context2.t7);

            case 17:
              return _context2.delegateYield(this.parsePlainScalar(), "t8", 18);

            case 18:
              return _context2.abrupt("return", _context2.t8);

            case 19:
            case "end":
              return _context2.stop();
          }
        }
      }, parseNext, this);
    })
  }, {
    key: "parseStream",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseStream() {
      var line, dirEnd, cs, ch, _ch, n, sp;

      return _regeneratorRuntime().wrap(function parseStream$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              line = this.getLine();

              if (!(line === null)) {
                _context3.next = 3;
                break;
              }

              return _context3.abrupt("return", this.setNext('stream'));

            case 3:
              if (!(line[0] === _cst.BOM)) {
                _context3.next = 6;
                break;
              }

              return _context3.delegateYield(this.pushCount(1), "t0", 5);

            case 5:
              line = line.substring(1);

            case 6:
              if (!(line[0] === '%')) {
                _context3.next = 27;
                break;
              }

              dirEnd = line.length;
              cs = line.indexOf('#');

              if (cs !== -1) {
                ch = line[cs - 1];
                if (ch === ' ' || ch === '\t') dirEnd = cs - 1;
              }

            case 10:
              if (!true) {
                _context3.next = 19;
                break;
              }

              _ch = line[dirEnd - 1];

              if (!(_ch === ' ' || _ch === '\t')) {
                _context3.next = 16;
                break;
              }

              dirEnd -= 1;
              _context3.next = 17;
              break;

            case 16:
              return _context3.abrupt("break", 19);

            case 17:
              _context3.next = 10;
              break;

            case 19:
              return _context3.delegateYield(this.pushCount(dirEnd), "t1", 20);

            case 20:
              _context3.t2 = _context3.t1;
              return _context3.delegateYield(this.pushSpaces(true), "t3", 22);

            case 22:
              _context3.t4 = _context3.t3;
              n = _context3.t2 + _context3.t4;
              return _context3.delegateYield(this.pushCount(line.length - n), "t5", 25);

            case 25:
              // possible comment
              this.pushNewline();
              return _context3.abrupt("return", 'stream');

            case 27:
              if (!this.atLineEnd()) {
                _context3.next = 33;
                break;
              }

              return _context3.delegateYield(this.pushSpaces(true), "t6", 29);

            case 29:
              sp = _context3.t6;
              return _context3.delegateYield(this.pushCount(line.length - sp), "t7", 31);

            case 31:
              return _context3.delegateYield(this.pushNewline(), "t8", 32);

            case 32:
              return _context3.abrupt("return", 'stream');

            case 33:
              _context3.next = 35;
              return _cst.DOCUMENT;

            case 35:
              return _context3.delegateYield(this.parseLineStart(), "t9", 36);

            case 36:
              return _context3.abrupt("return", _context3.t9);

            case 37:
            case "end":
              return _context3.stop();
          }
        }
      }, parseStream, this);
    })
  }, {
    key: "parseLineStart",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseLineStart() {
      var ch, s;
      return _regeneratorRuntime().wrap(function parseLineStart$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              ch = this.charAt(0);

              if (!(!ch && !this.atEnd)) {
                _context4.next = 3;
                break;
              }

              return _context4.abrupt("return", this.setNext('line-start'));

            case 3:
              if (!(ch === '-' || ch === '.')) {
                _context4.next = 17;
                break;
              }

              if (!(!this.atEnd && !this.hasChars(4))) {
                _context4.next = 6;
                break;
              }

              return _context4.abrupt("return", this.setNext('line-start'));

            case 6:
              s = this.peek(3);

              if (!(s === '---' && isEmpty(this.charAt(3)))) {
                _context4.next = 14;
                break;
              }

              return _context4.delegateYield(this.pushCount(3), "t0", 9);

            case 9:
              this.indentValue = 0;
              this.indentNext = 0;
              return _context4.abrupt("return", 'doc');

            case 14:
              if (!(s === '...' && isEmpty(this.charAt(3)))) {
                _context4.next = 17;
                break;
              }

              return _context4.delegateYield(this.pushCount(3), "t1", 16);

            case 16:
              return _context4.abrupt("return", 'stream');

            case 17:
              return _context4.delegateYield(this.pushSpaces(false), "t2", 18);

            case 18:
              this.indentValue = _context4.t2;
              if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1))) this.indentNext = this.indentValue;
              return _context4.delegateYield(this.parseBlockStart(), "t3", 21);

            case 21:
              return _context4.abrupt("return", _context4.t3);

            case 22:
            case "end":
              return _context4.stop();
          }
        }
      }, parseLineStart, this);
    })
  }, {
    key: "parseBlockStart",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseBlockStart() {
      var _this$peek, _this$peek2, ch0, ch1, n;

      return _regeneratorRuntime().wrap(function parseBlockStart$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _this$peek = this.peek(2), _this$peek2 = _slicedToArray(_this$peek, 2), ch0 = _this$peek2[0], ch1 = _this$peek2[1];

              if (!(!ch1 && !this.atEnd)) {
                _context5.next = 3;
                break;
              }

              return _context5.abrupt("return", this.setNext('block-start'));

            case 3:
              if (!((ch0 === '-' || ch0 === '?' || ch0 === ':') && isEmpty(ch1))) {
                _context5.next = 13;
                break;
              }

              return _context5.delegateYield(this.pushCount(1), "t0", 5);

            case 5:
              _context5.t1 = _context5.t0;
              return _context5.delegateYield(this.pushSpaces(true), "t2", 7);

            case 7:
              _context5.t3 = _context5.t2;
              n = _context5.t1 + _context5.t3;
              this.indentNext = this.indentValue + 1;
              this.indentValue += n;
              return _context5.delegateYield(this.parseBlockStart(), "t4", 12);

            case 12:
              return _context5.abrupt("return", _context5.t4);

            case 13:
              return _context5.abrupt("return", 'doc');

            case 14:
            case "end":
              return _context5.stop();
          }
        }
      }, parseBlockStart, this);
    })
  }, {
    key: "parseDocument",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseDocument() {
      var line, n;
      return _regeneratorRuntime().wrap(function parseDocument$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              return _context6.delegateYield(this.pushSpaces(true), "t0", 1);

            case 1:
              line = this.getLine();

              if (!(line === null)) {
                _context6.next = 4;
                break;
              }

              return _context6.abrupt("return", this.setNext('doc'));

            case 4:
              return _context6.delegateYield(this.pushIndicators(), "t1", 5);

            case 5:
              n = _context6.t1;
              _context6.t2 = line[n];
              _context6.next = _context6.t2 === '#' ? 9 : _context6.t2 === undefined ? 10 : _context6.t2 === '{' ? 13 : _context6.t2 === '[' ? 13 : _context6.t2 === '}' ? 17 : _context6.t2 === ']' ? 17 : _context6.t2 === '*' ? 19 : _context6.t2 === '"' ? 21 : _context6.t2 === "'" ? 21 : _context6.t2 === '|' ? 23 : _context6.t2 === '>' ? 23 : 33;
              break;

            case 9:
              return _context6.delegateYield(this.pushCount(line.length - n), "t3", 10);

            case 10:
              return _context6.delegateYield(this.pushNewline(), "t4", 11);

            case 11:
              return _context6.delegateYield(this.parseLineStart(), "t5", 12);

            case 12:
              return _context6.abrupt("return", _context6.t5);

            case 13:
              return _context6.delegateYield(this.pushCount(1), "t6", 14);

            case 14:
              this.flowKey = false;
              this.flowLevel = 1;
              return _context6.abrupt("return", 'flow');

            case 17:
              return _context6.delegateYield(this.pushCount(1), "t7", 18);

            case 18:
              return _context6.abrupt("return", 'doc');

            case 19:
              return _context6.delegateYield(this.pushUntil(isNotAnchorChar), "t8", 20);

            case 20:
              return _context6.abrupt("return", 'doc');

            case 21:
              return _context6.delegateYield(this.parseQuotedScalar(), "t9", 22);

            case 22:
              return _context6.abrupt("return", _context6.t9);

            case 23:
              _context6.t10 = n;
              return _context6.delegateYield(this.parseBlockScalarHeader(), "t11", 25);

            case 25:
              n = _context6.t10 += _context6.t11;
              _context6.t12 = n;
              return _context6.delegateYield(this.pushSpaces(true), "t13", 28);

            case 28:
              n = _context6.t12 += _context6.t13;
              return _context6.delegateYield(this.pushCount(line.length - n), "t14", 30);

            case 30:
              return _context6.delegateYield(this.pushNewline(), "t15", 31);

            case 31:
              return _context6.delegateYield(this.parseBlockScalar(), "t16", 32);

            case 32:
              return _context6.abrupt("return", _context6.t16);

            case 33:
              return _context6.delegateYield(this.parsePlainScalar(), "t17", 34);

            case 34:
              return _context6.abrupt("return", _context6.t17);

            case 35:
            case "end":
              return _context6.stop();
          }
        }
      }, parseDocument, this);
    })
  }, {
    key: "parseFlowCollection",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseFlowCollection() {
      var nl, sp, indent, line, atFlowEndMarker, n, next;
      return _regeneratorRuntime().wrap(function parseFlowCollection$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              indent = -1;

            case 1:
              return _context7.delegateYield(this.pushNewline(), "t0", 2);

            case 2:
              nl = _context7.t0;

              if (!(nl > 0)) {
                _context7.next = 9;
                break;
              }

              return _context7.delegateYield(this.pushSpaces(false), "t1", 5);

            case 5:
              sp = _context7.t1;
              this.indentValue = indent = sp;
              _context7.next = 10;
              break;

            case 9:
              sp = 0;

            case 10:
              _context7.t2 = sp;
              return _context7.delegateYield(this.pushSpaces(true), "t3", 12);

            case 12:
              sp = _context7.t2 += _context7.t3;

            case 13:
              if (nl + sp > 0) {
                _context7.next = 1;
                break;
              }

            case 14:
              line = this.getLine();

              if (!(line === null)) {
                _context7.next = 17;
                break;
              }

              return _context7.abrupt("return", this.setNext('flow'));

            case 17:
              if (!(indent !== -1 && indent < this.indentNext && line[0] !== '#' || indent === 0 && (line.startsWith('---') || line.startsWith('...')) && isEmpty(line[3]))) {
                _context7.next = 25;
                break;
              }

              // Allowing for the terminal ] or } at the same (rather than greater)
              // indent level as the initial [ or { is technically invalid, but
              // failing here would be surprising to users.
              atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === ']' || line[0] === '}');

              if (atFlowEndMarker) {
                _context7.next = 25;
                break;
              }

              // this is an error
              this.flowLevel = 0;
              _context7.next = 23;
              return _cst.FLOW_END;

            case 23:
              return _context7.delegateYield(this.parseLineStart(), "t4", 24);

            case 24:
              return _context7.abrupt("return", _context7.t4);

            case 25:
              n = 0;

            case 26:
              if (!(line[n] === ',')) {
                _context7.next = 36;
                break;
              }

              _context7.t5 = n;
              return _context7.delegateYield(this.pushCount(1), "t6", 29);

            case 29:
              n = _context7.t5 += _context7.t6;
              _context7.t7 = n;
              return _context7.delegateYield(this.pushSpaces(true), "t8", 32);

            case 32:
              n = _context7.t7 += _context7.t8;
              this.flowKey = false;
              _context7.next = 26;
              break;

            case 36:
              _context7.t9 = n;
              return _context7.delegateYield(this.pushIndicators(), "t10", 38);

            case 38:
              n = _context7.t9 += _context7.t10;
              _context7.t11 = line[n];
              _context7.next = _context7.t11 === undefined ? 42 : _context7.t11 === '#' ? 43 : _context7.t11 === '{' ? 45 : _context7.t11 === '[' ? 45 : _context7.t11 === '}' ? 49 : _context7.t11 === ']' ? 49 : _context7.t11 === '*' ? 53 : _context7.t11 === '"' ? 55 : _context7.t11 === "'" ? 55 : _context7.t11 === ':' ? 58 : 64;
              break;

            case 42:
              return _context7.abrupt("return", 'flow');

            case 43:
              return _context7.delegateYield(this.pushCount(line.length - n), "t12", 44);

            case 44:
              return _context7.abrupt("return", 'flow');

            case 45:
              return _context7.delegateYield(this.pushCount(1), "t13", 46);

            case 46:
              this.flowKey = false;
              this.flowLevel += 1;
              return _context7.abrupt("return", 'flow');

            case 49:
              return _context7.delegateYield(this.pushCount(1), "t14", 50);

            case 50:
              this.flowKey = true;
              this.flowLevel -= 1;
              return _context7.abrupt("return", this.flowLevel ? 'flow' : 'doc');

            case 53:
              return _context7.delegateYield(this.pushUntil(isNotAnchorChar), "t15", 54);

            case 54:
              return _context7.abrupt("return", 'flow');

            case 55:
              this.flowKey = true;
              return _context7.delegateYield(this.parseQuotedScalar(), "t16", 57);

            case 57:
              return _context7.abrupt("return", _context7.t16);

            case 58:
              next = this.charAt(1);

              if (!(this.flowKey || isEmpty(next) || next === ',')) {
                _context7.next = 64;
                break;
              }

              this.flowKey = false;
              return _context7.delegateYield(this.pushCount(1), "t17", 62);

            case 62:
              return _context7.delegateYield(this.pushSpaces(true), "t18", 63);

            case 63:
              return _context7.abrupt("return", 'flow');

            case 64:
              this.flowKey = false;
              return _context7.delegateYield(this.parsePlainScalar(), "t19", 66);

            case 66:
              return _context7.abrupt("return", _context7.t19);

            case 67:
            case "end":
              return _context7.stop();
          }
        }
      }, parseFlowCollection, this);
    })
  }, {
    key: "parseQuotedScalar",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseQuotedScalar() {
      var quote, end, n, qb, nl, cs;
      return _regeneratorRuntime().wrap(function parseQuotedScalar$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              quote = this.charAt(0);
              end = this.buffer.indexOf(quote, this.pos + 1);

              if (!(quote === "'")) {
                _context8.next = 6;
                break;
              }

              while (end !== -1 && this.buffer[end + 1] === "'") {
                end = this.buffer.indexOf("'", end + 2);
              }

              _context8.next = 14;
              break;

            case 6:
              if (!(end !== -1)) {
                _context8.next = 14;
                break;
              }

              n = 0;

              while (this.buffer[end - 1 - n] === '\\') {
                n += 1;
              }

              if (!(n % 2 === 0)) {
                _context8.next = 11;
                break;
              }

              return _context8.abrupt("break", 14);

            case 11:
              end = this.buffer.indexOf('"', end + 1);
              _context8.next = 6;
              break;

            case 14:
              // Only looking for newlines within the quotes
              qb = this.buffer.substring(0, end);
              nl = qb.indexOf('\n', this.pos);

              if (!(nl !== -1)) {
                _context8.next = 25;
                break;
              }

            case 17:
              if (!(nl !== -1)) {
                _context8.next = 24;
                break;
              }

              cs = this.continueScalar(nl + 1);

              if (!(cs === -1)) {
                _context8.next = 21;
                break;
              }

              return _context8.abrupt("break", 24);

            case 21:
              nl = qb.indexOf('\n', cs);
              _context8.next = 17;
              break;

            case 24:
              if (nl !== -1) {
                // this is an error caused by an unexpected unindent
                end = nl - (qb[nl - 1] === '\r' ? 2 : 1);
              }

            case 25:
              if (!(end === -1)) {
                _context8.next = 29;
                break;
              }

              if (this.atEnd) {
                _context8.next = 28;
                break;
              }

              return _context8.abrupt("return", this.setNext('quoted-scalar'));

            case 28:
              end = this.buffer.length;

            case 29:
              return _context8.delegateYield(this.pushToIndex(end + 1, false), "t0", 30);

            case 30:
              return _context8.abrupt("return", this.flowLevel ? 'flow' : 'doc');

            case 31:
            case "end":
              return _context8.stop();
          }
        }
      }, parseQuotedScalar, this);
    })
  }, {
    key: "parseBlockScalarHeader",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseBlockScalarHeader() {
      var i, ch;
      return _regeneratorRuntime().wrap(function parseBlockScalarHeader$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              this.blockScalarIndent = -1;
              this.blockScalarKeep = false;
              i = this.pos;

            case 3:
              if (!true) {
                _context9.next = 17;
                break;
              }

              ch = this.buffer[++i];

              if (!(ch === '+')) {
                _context9.next = 9;
                break;
              }

              this.blockScalarKeep = true;
              _context9.next = 15;
              break;

            case 9:
              if (!(ch > '0' && ch <= '9')) {
                _context9.next = 13;
                break;
              }

              this.blockScalarIndent = Number(ch) - 1;
              _context9.next = 15;
              break;

            case 13:
              if (!(ch !== '-')) {
                _context9.next = 15;
                break;
              }

              return _context9.abrupt("break", 17);

            case 15:
              _context9.next = 3;
              break;

            case 17:
              return _context9.delegateYield(this.pushUntil(function (ch) {
                return isEmpty(ch) || ch === '#';
              }), "t0", 18);

            case 18:
              return _context9.abrupt("return", _context9.t0);

            case 19:
            case "end":
              return _context9.stop();
          }
        }
      }, parseBlockScalarHeader, this);
    })
  }, {
    key: "parseBlockScalar",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parseBlockScalar() {
      var nl, indent, ch, i, next, cs, _i2, _ch2, lastChar;

      return _regeneratorRuntime().wrap(function parseBlockScalar$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              nl = this.pos - 1; // may be -1 if this.pos === 0

              indent = 0;
              i = this.pos;

            case 3:
              if (!(ch = this.buffer[i])) {
                _context10.next = 21;
                break;
              }

              _context10.t0 = ch;
              _context10.next = _context10.t0 === ' ' ? 7 : _context10.t0 === '\n' ? 9 : _context10.t0 === '\r' ? 12 : 17;
              break;

            case 7:
              indent += 1;
              return _context10.abrupt("break", 18);

            case 9:
              nl = i;
              indent = 0;
              return _context10.abrupt("break", 18);

            case 12:
              next = this.buffer[i + 1];

              if (!(!next && !this.atEnd)) {
                _context10.next = 15;
                break;
              }

              return _context10.abrupt("return", this.setNext('block-scalar'));

            case 15:
              if (!(next === '\n')) {
                _context10.next = 17;
                break;
              }

              return _context10.abrupt("break", 18);

            case 17:
              return _context10.abrupt("break", 21);

            case 18:
              ++i;
              _context10.next = 3;
              break;

            case 21:
              if (!(!ch && !this.atEnd)) {
                _context10.next = 23;
                break;
              }

              return _context10.abrupt("return", this.setNext('block-scalar'));

            case 23:
              if (!(indent >= this.indentNext)) {
                _context10.next = 34;
                break;
              }

              if (this.blockScalarIndent === -1) this.indentNext = indent;else this.indentNext += this.blockScalarIndent;

            case 25:
              cs = this.continueScalar(nl + 1);

              if (!(cs === -1)) {
                _context10.next = 28;
                break;
              }

              return _context10.abrupt("break", 30);

            case 28:
              nl = this.buffer.indexOf('\n', cs);

            case 29:
              if (nl !== -1) {
                _context10.next = 25;
                break;
              }

            case 30:
              if (!(nl === -1)) {
                _context10.next = 34;
                break;
              }

              if (this.atEnd) {
                _context10.next = 33;
                break;
              }

              return _context10.abrupt("return", this.setNext('block-scalar'));

            case 33:
              nl = this.buffer.length;

            case 34:
              if (this.blockScalarKeep) {
                _context10.next = 46;
                break;
              }

            case 35:
              _i2 = nl - 1;
              _ch2 = this.buffer[_i2];
              if (_ch2 === '\r') _ch2 = this.buffer[--_i2];
              lastChar = _i2; // Drop the line if last char not more indented

              while (_ch2 === ' ' || _ch2 === '\t') {
                _ch2 = this.buffer[--_i2];
              }

              if (!(_ch2 === '\n' && _i2 >= this.pos && _i2 + 1 + indent > lastChar)) {
                _context10.next = 44;
                break;
              }

              nl = _i2;
              _context10.next = 45;
              break;

            case 44:
              return _context10.abrupt("break", 46);

            case 45:
              if (true) {
                _context10.next = 35;
                break;
              }

            case 46:
              _context10.next = 48;
              return _cst.SCALAR;

            case 48:
              return _context10.delegateYield(this.pushToIndex(nl + 1, true), "t1", 49);

            case 49:
              return _context10.delegateYield(this.parseLineStart(), "t2", 50);

            case 50:
              return _context10.abrupt("return", _context10.t2);

            case 51:
            case "end":
              return _context10.stop();
          }
        }
      }, parseBlockScalar, this);
    })
  }, {
    key: "parsePlainScalar",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function parsePlainScalar() {
      var inFlow, end, i, ch, next, _next, cs;

      return _regeneratorRuntime().wrap(function parsePlainScalar$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              inFlow = this.flowLevel > 0;
              end = this.pos - 1;
              i = this.pos - 1;

            case 3:
              if (!(ch = this.buffer[++i])) {
                _context11.next = 28;
                break;
              }

              if (!(ch === ':')) {
                _context11.next = 11;
                break;
              }

              next = this.buffer[i + 1];

              if (!(isEmpty(next) || inFlow && next === ',')) {
                _context11.next = 8;
                break;
              }

              return _context11.abrupt("break", 28);

            case 8:
              end = i;
              _context11.next = 26;
              break;

            case 11:
              if (!isEmpty(ch)) {
                _context11.next = 23;
                break;
              }

              _next = this.buffer[i + 1];

              if (ch === '\r') {
                if (_next === '\n') {
                  i += 1;
                  ch = '\n';
                  _next = this.buffer[i + 1];
                } else end = i;
              }

              if (!(_next === '#' || inFlow && invalidFlowScalarChars.includes(_next))) {
                _context11.next = 16;
                break;
              }

              return _context11.abrupt("break", 28);

            case 16:
              if (!(ch === '\n')) {
                _context11.next = 21;
                break;
              }

              cs = this.continueScalar(i + 1);

              if (!(cs === -1)) {
                _context11.next = 20;
                break;
              }

              return _context11.abrupt("break", 28);

            case 20:
              i = Math.max(i, cs - 2); // to advance, but still account for ' #'

            case 21:
              _context11.next = 26;
              break;

            case 23:
              if (!(inFlow && invalidFlowScalarChars.includes(ch))) {
                _context11.next = 25;
                break;
              }

              return _context11.abrupt("break", 28);

            case 25:
              end = i;

            case 26:
              _context11.next = 3;
              break;

            case 28:
              if (!(!ch && !this.atEnd)) {
                _context11.next = 30;
                break;
              }

              return _context11.abrupt("return", this.setNext('plain-scalar'));

            case 30:
              _context11.next = 32;
              return _cst.SCALAR;

            case 32:
              return _context11.delegateYield(this.pushToIndex(end + 1, true), "t0", 33);

            case 33:
              return _context11.abrupt("return", inFlow ? 'flow' : 'doc');

            case 34:
            case "end":
              return _context11.stop();
          }
        }
      }, parsePlainScalar, this);
    })
  }, {
    key: "pushCount",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushCount(n) {
      return _regeneratorRuntime().wrap(function pushCount$(_context12) {
        while (1) {
          switch (_context12.prev = _context12.next) {
            case 0:
              if (!(n > 0)) {
                _context12.next = 5;
                break;
              }

              _context12.next = 3;
              return this.buffer.substr(this.pos, n);

            case 3:
              this.pos += n;
              return _context12.abrupt("return", n);

            case 5:
              return _context12.abrupt("return", 0);

            case 6:
            case "end":
              return _context12.stop();
          }
        }
      }, pushCount, this);
    })
  }, {
    key: "pushToIndex",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushToIndex(i, allowEmpty) {
      var s;
      return _regeneratorRuntime().wrap(function pushToIndex$(_context13) {
        while (1) {
          switch (_context13.prev = _context13.next) {
            case 0:
              s = this.buffer.slice(this.pos, i);

              if (!s) {
                _context13.next = 8;
                break;
              }

              _context13.next = 4;
              return s;

            case 4:
              this.pos += s.length;
              return _context13.abrupt("return", s.length);

            case 8:
              if (!allowEmpty) {
                _context13.next = 11;
                break;
              }

              _context13.next = 11;
              return '';

            case 11:
              return _context13.abrupt("return", 0);

            case 12:
            case "end":
              return _context13.stop();
          }
        }
      }, pushToIndex, this);
    })
  }, {
    key: "pushIndicators",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushIndicators() {
      var inFlow, ch1;
      return _regeneratorRuntime().wrap(function pushIndicators$(_context14) {
        while (1) {
          switch (_context14.prev = _context14.next) {
            case 0:
              _context14.t0 = this.charAt(0);
              _context14.next = _context14.t0 === '!' ? 3 : _context14.t0 === '&' ? 11 : _context14.t0 === '-' ? 19 : _context14.t0 === '?' ? 19 : _context14.t0 === ':' ? 19 : 31;
              break;

            case 3:
              return _context14.delegateYield(this.pushTag(), "t1", 4);

            case 4:
              _context14.t2 = _context14.t1;
              return _context14.delegateYield(this.pushSpaces(true), "t3", 6);

            case 6:
              _context14.t4 = _context14.t3;
              _context14.t5 = _context14.t2 + _context14.t4;
              return _context14.delegateYield(this.pushIndicators(), "t6", 9);

            case 9:
              _context14.t7 = _context14.t6;
              return _context14.abrupt("return", _context14.t5 + _context14.t7);

            case 11:
              return _context14.delegateYield(this.pushUntil(isNotAnchorChar), "t8", 12);

            case 12:
              _context14.t9 = _context14.t8;
              return _context14.delegateYield(this.pushSpaces(true), "t10", 14);

            case 14:
              _context14.t11 = _context14.t10;
              _context14.t12 = _context14.t9 + _context14.t11;
              return _context14.delegateYield(this.pushIndicators(), "t13", 17);

            case 17:
              _context14.t14 = _context14.t13;
              return _context14.abrupt("return", _context14.t12 + _context14.t14);

            case 19:
              inFlow = this.flowLevel > 0;
              ch1 = this.charAt(1);

              if (!(isEmpty(ch1) || inFlow && invalidFlowScalarChars.includes(ch1))) {
                _context14.next = 31;
                break;
              }

              if (!inFlow) this.indentNext = this.indentValue + 1;else if (this.flowKey) this.flowKey = false;
              return _context14.delegateYield(this.pushCount(1), "t15", 24);

            case 24:
              _context14.t16 = _context14.t15;
              return _context14.delegateYield(this.pushSpaces(true), "t17", 26);

            case 26:
              _context14.t18 = _context14.t17;
              _context14.t19 = _context14.t16 + _context14.t18;
              return _context14.delegateYield(this.pushIndicators(), "t20", 29);

            case 29:
              _context14.t21 = _context14.t20;
              return _context14.abrupt("return", _context14.t19 + _context14.t21);

            case 31:
              return _context14.abrupt("return", 0);

            case 32:
            case "end":
              return _context14.stop();
          }
        }
      }, pushIndicators, this);
    })
  }, {
    key: "pushTag",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushTag() {
      var i, ch, _i3, _ch3;

      return _regeneratorRuntime().wrap(function pushTag$(_context15) {
        while (1) {
          switch (_context15.prev = _context15.next) {
            case 0:
              if (!(this.charAt(1) === '<')) {
                _context15.next = 8;
                break;
              }

              i = this.pos + 2;
              ch = this.buffer[i];

              while (!isEmpty(ch) && ch !== '>') {
                ch = this.buffer[++i];
              }

              return _context15.delegateYield(this.pushToIndex(ch === '>' ? i + 1 : i, false), "t0", 5);

            case 5:
              return _context15.abrupt("return", _context15.t0);

            case 8:
              _i3 = this.pos + 1;
              _ch3 = this.buffer[_i3];

            case 10:
              if (!_ch3) {
                _context15.next = 22;
                break;
              }

              if (!tagChars.includes(_ch3)) {
                _context15.next = 15;
                break;
              }

              _ch3 = this.buffer[++_i3];
              _context15.next = 20;
              break;

            case 15:
              if (!(_ch3 === '%' && hexDigits.includes(this.buffer[_i3 + 1]) && hexDigits.includes(this.buffer[_i3 + 2]))) {
                _context15.next = 19;
                break;
              }

              _ch3 = this.buffer[_i3 += 3];
              _context15.next = 20;
              break;

            case 19:
              return _context15.abrupt("break", 22);

            case 20:
              _context15.next = 10;
              break;

            case 22:
              return _context15.delegateYield(this.pushToIndex(_i3, false), "t1", 23);

            case 23:
              return _context15.abrupt("return", _context15.t1);

            case 24:
            case "end":
              return _context15.stop();
          }
        }
      }, pushTag, this);
    })
  }, {
    key: "pushNewline",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushNewline() {
      var ch;
      return _regeneratorRuntime().wrap(function pushNewline$(_context16) {
        while (1) {
          switch (_context16.prev = _context16.next) {
            case 0:
              ch = this.buffer[this.pos];

              if (!(ch === '\n')) {
                _context16.next = 6;
                break;
              }

              return _context16.delegateYield(this.pushCount(1), "t0", 3);

            case 3:
              return _context16.abrupt("return", _context16.t0);

            case 6:
              if (!(ch === '\r' && this.charAt(1) === '\n')) {
                _context16.next = 11;
                break;
              }

              return _context16.delegateYield(this.pushCount(2), "t1", 8);

            case 8:
              return _context16.abrupt("return", _context16.t1);

            case 11:
              return _context16.abrupt("return", 0);

            case 12:
            case "end":
              return _context16.stop();
          }
        }
      }, pushNewline, this);
    })
  }, {
    key: "pushSpaces",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushSpaces(allowTabs) {
      var i, ch, n;
      return _regeneratorRuntime().wrap(function pushSpaces$(_context17) {
        while (1) {
          switch (_context17.prev = _context17.next) {
            case 0:
              i = this.pos - 1;

              do {
                ch = this.buffer[++i];
              } while (ch === ' ' || allowTabs && ch === '\t');

              n = i - this.pos;

              if (!(n > 0)) {
                _context17.next = 7;
                break;
              }

              _context17.next = 6;
              return this.buffer.substr(this.pos, n);

            case 6:
              this.pos = i;

            case 7:
              return _context17.abrupt("return", n);

            case 8:
            case "end":
              return _context17.stop();
          }
        }
      }, pushSpaces, this);
    })
  }, {
    key: "pushUntil",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pushUntil(test) {
      var i, ch;
      return _regeneratorRuntime().wrap(function pushUntil$(_context18) {
        while (1) {
          switch (_context18.prev = _context18.next) {
            case 0:
              i = this.pos;
              ch = this.buffer[i];

              while (!test(ch)) {
                ch = this.buffer[++i];
              }

              return _context18.delegateYield(this.pushToIndex(i, false), "t0", 4);

            case 4:
              return _context18.abrupt("return", _context18.t0);

            case 5:
            case "end":
              return _context18.stop();
          }
        }
      }, pushUntil, this);
    })
  }]);

  return Lexer;
}();

exports.Lexer = Lexer;

},{"./cst.js":41}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LineCounter = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Tracks newlines during parsing in order to provide an efficient API for
 * determining the one-indexed `{ line, col }` position for any offset
 * within the input.
 */
var LineCounter = /*#__PURE__*/_createClass(function LineCounter() {
  var _this = this;

  _classCallCheck(this, LineCounter);

  this.lineStarts = [];
  /**
   * Should be called in ascending order. Otherwise, call
   * `lineCounter.lineStarts.sort()` before calling `linePos()`.
   */

  this.addNewLine = function (offset) {
    return _this.lineStarts.push(offset);
  };
  /**
   * Performs a binary search and returns the 1-indexed { line, col }
   * position of `offset`. If `line === 0`, `addNewLine` has never been
   * called or `offset` is before the first known newline.
   */


  this.linePos = function (offset) {
    var low = 0;
    var high = _this.lineStarts.length;

    while (low < high) {
      var mid = low + high >> 1; // Math.floor((low + high) / 2)

      if (_this.lineStarts[mid] < offset) low = mid + 1;else high = mid;
    }

    if (_this.lineStarts[low] === offset) return {
      line: low + 1,
      col: 1
    };
    if (low === 0) return {
      line: 0,
      col: offset
    };
    var start = _this.lineStarts[low - 1];
    return {
      line: low,
      col: offset - start + 1
    };
  };
});

exports.LineCounter = LineCounter;

},{}],44:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Parser = void 0;

var _cst = require("./cst.js");

var _lexer = require("./lexer.js");

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function includesToken(list, type) {
  for (var i = 0; i < list.length; ++i) {
    if (list[i].type === type) return true;
  }

  return false;
}

function findNonEmptyIndex(list) {
  for (var i = 0; i < list.length; ++i) {
    switch (list[i].type) {
      case 'space':
      case 'comment':
      case 'newline':
        break;

      default:
        return i;
    }
  }

  return -1;
}

function isFlowToken(token) {
  switch (token === null || token === void 0 ? void 0 : token.type) {
    case 'alias':
    case 'scalar':
    case 'single-quoted-scalar':
    case 'double-quoted-scalar':
    case 'flow-collection':
      return true;

    default:
      return false;
  }
}

function getPrevProps(parent) {
  switch (parent.type) {
    case 'document':
      return parent.start;

    case 'block-map':
      {
        var _it$sep;

        var it = parent.items[parent.items.length - 1];
        return (_it$sep = it.sep) !== null && _it$sep !== void 0 ? _it$sep : it.start;
      }

    case 'block-seq':
      return parent.items[parent.items.length - 1].start;

    /* istanbul ignore next should not happen */

    default:
      return [];
  }
}
/** Note: May modify input array */


function getFirstKeyStartProps(prev) {
  if (prev.length === 0) return [];
  var i = prev.length;

  loop: while (--i >= 0) {
    switch (prev[i].type) {
      case 'doc-start':
      case 'explicit-key-ind':
      case 'map-value-ind':
      case 'seq-item-ind':
      case 'newline':
        break loop;
    }
  }

  while (((_prev$i = prev[++i]) === null || _prev$i === void 0 ? void 0 : _prev$i.type) === 'space') {
    /* loop */

    var _prev$i;
  }

  return prev.splice(i, prev.length);
}

function fixFlowSeqItems(fc) {
  if (fc.start.type === 'flow-seq-start') {
    var _iterator = _createForOfIteratorHelper(fc.items),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var it = _step.value;

        if (it.sep && !it.value && !includesToken(it.start, 'explicit-key-ind') && !includesToken(it.sep, 'map-value-ind')) {
          if (it.key) it.value = it.key;
          delete it.key;

          if (isFlowToken(it.value)) {
            if (it.value.end) Array.prototype.push.apply(it.value.end, it.sep);else it.value.end = it.sep;
          } else Array.prototype.push.apply(it.start, it.sep);

          delete it.sep;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }
}
/**
 * A YAML concrete syntax tree (CST) parser
 *
 * ```ts
 * const src: string = ...
 * for (const token of new Parser().parse(src)) {
 *   // token: Token
 * }
 * ```
 *
 * To use the parser with a user-provided lexer:
 *
 * ```ts
 * function* parse(source: string, lexer: Lexer) {
 *   const parser = new Parser()
 *   for (const lexeme of lexer.lex(source))
 *     yield* parser.next(lexeme)
 *   yield* parser.end()
 * }
 *
 * const src: string = ...
 * const lexer = new Lexer()
 * for (const token of parse(src, lexer)) {
 *   // token: Token
 * }
 * ```
 */


var Parser = /*#__PURE__*/function () {
  /**
   * @param onNewLine - If defined, called separately with the start position of
   *   each new line (in `parse()`, including the start of input).
   */
  function Parser(onNewLine) {
    _classCallCheck(this, Parser);

    /** If true, space and sequence indicators count as indentation */
    this.atNewLine = true;
    /** If true, next token is a scalar value */

    this.atScalar = false;
    /** Current indentation level */

    this.indent = 0;
    /** Current offset since the start of parsing */

    this.offset = 0;
    /** On the same line with a block map key */

    this.onKeyLine = false;
    /** Top indicates the node that's currently being built */

    this.stack = [];
    /** The source of the current token, set in parse() */

    this.source = '';
    /** The type of the current token, set in parse() */

    this.type = ''; // Must be defined after `next()`

    this.lexer = new _lexer.Lexer();
    this.onNewLine = onNewLine;
  }
  /**
   * Parse `source` as a YAML stream.
   * If `incomplete`, a part of the last line may be left as a buffer for the next call.
   *
   * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
   *
   * @returns A generator of tokens representing each directive, document, and other structure.
   */


  _createClass(Parser, [{
    key: "parse",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function parse(source) {
      var incomplete,
          _iterator2,
          _step2,
          lexeme,
          _args = arguments;

      return _regeneratorRuntime().wrap(function parse$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              incomplete = _args.length > 1 && _args[1] !== undefined ? _args[1] : false;
              if (this.onNewLine && this.offset === 0) this.onNewLine(0);
              _iterator2 = _createForOfIteratorHelper(this.lexer.lex(source, incomplete));
              _context.prev = 3;

              _iterator2.s();

            case 5:
              if ((_step2 = _iterator2.n()).done) {
                _context.next = 10;
                break;
              }

              lexeme = _step2.value;
              return _context.delegateYield(this.next(lexeme), "t0", 8);

            case 8:
              _context.next = 5;
              break;

            case 10:
              _context.next = 15;
              break;

            case 12:
              _context.prev = 12;
              _context.t1 = _context["catch"](3);

              _iterator2.e(_context.t1);

            case 15:
              _context.prev = 15;

              _iterator2.f();

              return _context.finish(15);

            case 18:
              if (incomplete) {
                _context.next = 20;
                break;
              }

              return _context.delegateYield(this.end(), "t2", 20);

            case 20:
            case "end":
              return _context.stop();
          }
        }
      }, parse, this, [[3, 12, 15, 18]]);
    })
    /**
     * Advance the parser by the `source` of one lexical token.
     */

  }, {
    key: "next",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function next(source) {
      var type, message;
      return _regeneratorRuntime().wrap(function next$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              this.source = source;

              if (!this.atScalar) {
                _context2.next = 6;
                break;
              }

              this.atScalar = false;
              return _context2.delegateYield(this.step(), "t0", 4);

            case 4:
              this.offset += source.length;
              return _context2.abrupt("return");

            case 6:
              type = (0, _cst.tokenType)(source);

              if (type) {
                _context2.next = 13;
                break;
              }

              message = "Not a YAML token: ".concat(source);
              return _context2.delegateYield(this.pop({
                type: 'error',
                offset: this.offset,
                message: message,
                source: source
              }), "t1", 10);

            case 10:
              this.offset += source.length;
              _context2.next = 35;
              break;

            case 13:
              if (!(type === 'scalar')) {
                _context2.next = 19;
                break;
              }

              this.atNewLine = false;
              this.atScalar = true;
              this.type = 'scalar';
              _context2.next = 35;
              break;

            case 19:
              this.type = type;
              return _context2.delegateYield(this.step(), "t2", 21);

            case 21:
              _context2.t3 = type;
              _context2.next = _context2.t3 === 'newline' ? 24 : _context2.t3 === 'space' ? 28 : _context2.t3 === 'explicit-key-ind' ? 30 : _context2.t3 === 'map-value-ind' ? 30 : _context2.t3 === 'seq-item-ind' ? 30 : _context2.t3 === 'doc-mode' ? 32 : _context2.t3 === 'flow-error-end' ? 32 : 33;
              break;

            case 24:
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine) this.onNewLine(this.offset + source.length);
              return _context2.abrupt("break", 34);

            case 28:
              if (this.atNewLine && source[0] === ' ') this.indent += source.length;
              return _context2.abrupt("break", 34);

            case 30:
              if (this.atNewLine) this.indent += source.length;
              return _context2.abrupt("break", 34);

            case 32:
              return _context2.abrupt("return");

            case 33:
              this.atNewLine = false;

            case 34:
              this.offset += source.length;

            case 35:
            case "end":
              return _context2.stop();
          }
        }
      }, next, this);
    })
    /** Call at end of input to push out any remaining constructions */

  }, {
    key: "end",
    value:
    /*#__PURE__*/
    _regeneratorRuntime().mark(function end() {
      return _regeneratorRuntime().wrap(function end$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (!(this.stack.length > 0)) {
                _context3.next = 4;
                break;
              }

              return _context3.delegateYield(this.pop(), "t0", 2);

            case 2:
              _context3.next = 0;
              break;

            case 4:
            case "end":
              return _context3.stop();
          }
        }
      }, end, this);
    })
  }, {
    key: "sourceToken",
    get: function get() {
      var st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
  }, {
    key: "step",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function step() {
      var top;
      return _regeneratorRuntime().wrap(function step$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              top = this.peek(1);

              if (!(this.type === 'doc-end' && (!top || top.type !== 'doc-end'))) {
                _context4.next = 8;
                break;
              }

            case 2:
              if (!(this.stack.length > 0)) {
                _context4.next = 6;
                break;
              }

              return _context4.delegateYield(this.pop(), "t0", 4);

            case 4:
              _context4.next = 2;
              break;

            case 6:
              this.stack.push({
                type: 'doc-end',
                offset: this.offset,
                source: this.source
              });
              return _context4.abrupt("return");

            case 8:
              if (top) {
                _context4.next = 11;
                break;
              }

              return _context4.delegateYield(this.stream(), "t1", 10);

            case 10:
              return _context4.abrupt("return", _context4.t1);

            case 11:
              _context4.t2 = top.type;
              _context4.next = _context4.t2 === 'document' ? 14 : _context4.t2 === 'alias' ? 16 : _context4.t2 === 'scalar' ? 16 : _context4.t2 === 'single-quoted-scalar' ? 16 : _context4.t2 === 'double-quoted-scalar' ? 16 : _context4.t2 === 'block-scalar' ? 18 : _context4.t2 === 'block-map' ? 20 : _context4.t2 === 'block-seq' ? 22 : _context4.t2 === 'flow-collection' ? 24 : _context4.t2 === 'doc-end' ? 26 : 28;
              break;

            case 14:
              return _context4.delegateYield(this.document(top), "t3", 15);

            case 15:
              return _context4.abrupt("return", _context4.t3);

            case 16:
              return _context4.delegateYield(this.scalar(top), "t4", 17);

            case 17:
              return _context4.abrupt("return", _context4.t4);

            case 18:
              return _context4.delegateYield(this.blockScalar(top), "t5", 19);

            case 19:
              return _context4.abrupt("return", _context4.t5);

            case 20:
              return _context4.delegateYield(this.blockMap(top), "t6", 21);

            case 21:
              return _context4.abrupt("return", _context4.t6);

            case 22:
              return _context4.delegateYield(this.blockSequence(top), "t7", 23);

            case 23:
              return _context4.abrupt("return", _context4.t7);

            case 24:
              return _context4.delegateYield(this.flowCollection(top), "t8", 25);

            case 25:
              return _context4.abrupt("return", _context4.t8);

            case 26:
              return _context4.delegateYield(this.documentEnd(top), "t9", 27);

            case 27:
              return _context4.abrupt("return", _context4.t9);

            case 28:
              return _context4.delegateYield(this.pop(), "t10", 29);

            case 29:
            case "end":
              return _context4.stop();
          }
        }
      }, step, this);
    })
  }, {
    key: "peek",
    value: function peek(n) {
      return this.stack[this.stack.length - n];
    }
  }, {
    key: "pop",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function pop(error) {
      var token, message, top, it, _it, _it2, last;

      return _regeneratorRuntime().wrap(function pop$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              token = error !== null && error !== void 0 ? error : this.stack.pop();
              /* istanbul ignore if should not happen */

              if (token) {
                _context5.next = 7;
                break;
              }

              message = 'Tried to pop an empty stack';
              _context5.next = 5;
              return {
                type: 'error',
                offset: this.offset,
                source: '',
                message: message
              };

            case 5:
              _context5.next = 46;
              break;

            case 7:
              if (!(this.stack.length === 0)) {
                _context5.next = 12;
                break;
              }

              _context5.next = 10;
              return token;

            case 10:
              _context5.next = 46;
              break;

            case 12:
              top = this.peek(1);

              if (token.type === 'block-scalar') {
                // Block scalars use their parent rather than header indent
                token.indent = 'indent' in top ? top.indent : 0;
              } else if (token.type === 'flow-collection' && top.type === 'document') {
                // Ignore all indent for top-level flow collections
                token.indent = 0;
              }

              if (token.type === 'flow-collection') fixFlowSeqItems(token);
              _context5.t0 = top.type;
              _context5.next = _context5.t0 === 'document' ? 18 : _context5.t0 === 'block-scalar' ? 20 : _context5.t0 === 'block-map' ? 22 : _context5.t0 === 'block-seq' ? 37 : _context5.t0 === 'flow-collection' ? 40 : 43;
              break;

            case 18:
              top.value = token;
              return _context5.abrupt("break", 45);

            case 20:
              top.props.push(token); // error

              return _context5.abrupt("break", 45);

            case 22:
              it = top.items[top.items.length - 1];

              if (!it.value) {
                _context5.next = 29;
                break;
              }

              top.items.push({
                start: [],
                key: token,
                sep: []
              });
              this.onKeyLine = true;
              return _context5.abrupt("return");

            case 29:
              if (!it.sep) {
                _context5.next = 33;
                break;
              }

              it.value = token;
              _context5.next = 36;
              break;

            case 33:
              Object.assign(it, {
                key: token,
                sep: []
              });
              this.onKeyLine = !includesToken(it.start, 'explicit-key-ind');
              return _context5.abrupt("return");

            case 36:
              return _context5.abrupt("break", 45);

            case 37:
              _it = top.items[top.items.length - 1];
              if (_it.value) top.items.push({
                start: [],
                value: token
              });else _it.value = token;
              return _context5.abrupt("break", 45);

            case 40:
              _it2 = top.items[top.items.length - 1];
              if (!_it2 || _it2.value) top.items.push({
                start: [],
                key: token,
                sep: []
              });else if (_it2.sep) _it2.value = token;else Object.assign(_it2, {
                key: token,
                sep: []
              });
              return _context5.abrupt("return");

            case 43:
              return _context5.delegateYield(this.pop(), "t1", 44);

            case 44:
              return _context5.delegateYield(this.pop(token), "t2", 45);

            case 45:
              if ((top.type === 'document' || top.type === 'block-map' || top.type === 'block-seq') && (token.type === 'block-map' || token.type === 'block-seq')) {
                last = token.items[token.items.length - 1];

                if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every(function (st) {
                  return st.type !== 'comment' || st.indent < token.indent;
                }))) {
                  if (top.type === 'document') top.end = last.start;else top.items.push({
                    start: last.start
                  });
                  token.items.splice(-1, 1);
                }
              }

            case 46:
            case "end":
              return _context5.stop();
          }
        }
      }, pop, this);
    })
  }, {
    key: "stream",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function stream() {
      var doc;
      return _regeneratorRuntime().wrap(function stream$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.t0 = this.type;
              _context6.next = _context6.t0 === 'directive-line' ? 3 : _context6.t0 === 'byte-order-mark' ? 6 : _context6.t0 === 'space' ? 6 : _context6.t0 === 'comment' ? 6 : _context6.t0 === 'newline' ? 6 : _context6.t0 === 'doc-mode' ? 9 : _context6.t0 === 'doc-start' ? 9 : 13;
              break;

            case 3:
              _context6.next = 5;
              return {
                type: 'directive',
                offset: this.offset,
                source: this.source
              };

            case 5:
              return _context6.abrupt("return");

            case 6:
              _context6.next = 8;
              return this.sourceToken;

            case 8:
              return _context6.abrupt("return");

            case 9:
              doc = {
                type: 'document',
                offset: this.offset,
                start: []
              };
              if (this.type === 'doc-start') doc.start.push(this.sourceToken);
              this.stack.push(doc);
              return _context6.abrupt("return");

            case 13:
              _context6.next = 15;
              return {
                type: 'error',
                offset: this.offset,
                message: "Unexpected ".concat(this.type, " token in YAML stream"),
                source: this.source
              };

            case 15:
            case "end":
              return _context6.stop();
          }
        }
      }, stream, this);
    })
  }, {
    key: "document",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function document(doc) {
      var bv;
      return _regeneratorRuntime().wrap(function document$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              if (!doc.value) {
                _context7.next = 3;
                break;
              }

              return _context7.delegateYield(this.lineEnd(doc), "t0", 2);

            case 2:
              return _context7.abrupt("return", _context7.t0);

            case 3:
              _context7.t1 = this.type;
              _context7.next = _context7.t1 === 'doc-start' ? 6 : _context7.t1 === 'anchor' ? 13 : _context7.t1 === 'tag' ? 13 : _context7.t1 === 'space' ? 13 : _context7.t1 === 'comment' ? 13 : _context7.t1 === 'newline' ? 13 : 15;
              break;

            case 6:
              if (!(findNonEmptyIndex(doc.start) !== -1)) {
                _context7.next = 11;
                break;
              }

              return _context7.delegateYield(this.pop(), "t2", 8);

            case 8:
              return _context7.delegateYield(this.step(), "t3", 9);

            case 9:
              _context7.next = 12;
              break;

            case 11:
              doc.start.push(this.sourceToken);

            case 12:
              return _context7.abrupt("return");

            case 13:
              doc.start.push(this.sourceToken);
              return _context7.abrupt("return");

            case 15:
              bv = this.startBlockValue(doc);

              if (!bv) {
                _context7.next = 20;
                break;
              }

              this.stack.push(bv);
              _context7.next = 22;
              break;

            case 20:
              _context7.next = 22;
              return {
                type: 'error',
                offset: this.offset,
                message: "Unexpected ".concat(this.type, " token in YAML document"),
                source: this.source
              };

            case 22:
            case "end":
              return _context7.stop();
          }
        }
      }, document, this);
    })
  }, {
    key: "scalar",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function scalar(_scalar) {
      var prev, start, sep, map;
      return _regeneratorRuntime().wrap(function scalar$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              if (!(this.type === 'map-value-ind')) {
                _context8.next = 9;
                break;
              }

              prev = getPrevProps(this.peek(2));
              start = getFirstKeyStartProps(prev);

              if (_scalar.end) {
                sep = _scalar.end;
                sep.push(this.sourceToken);
                delete _scalar.end;
              } else sep = [this.sourceToken];

              map = {
                type: 'block-map',
                offset: _scalar.offset,
                indent: _scalar.indent,
                items: [{
                  start: start,
                  key: _scalar,
                  sep: sep
                }]
              };
              this.onKeyLine = true;
              this.stack[this.stack.length - 1] = map;
              _context8.next = 10;
              break;

            case 9:
              return _context8.delegateYield(this.lineEnd(_scalar), "t0", 10);

            case 10:
            case "end":
              return _context8.stop();
          }
        }
      }, scalar, this);
    })
  }, {
    key: "blockScalar",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function blockScalar(scalar) {
      var nl;
      return _regeneratorRuntime().wrap(function blockScalar$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.t0 = this.type;
              _context9.next = _context9.t0 === 'space' ? 3 : _context9.t0 === 'comment' ? 3 : _context9.t0 === 'newline' ? 3 : _context9.t0 === 'scalar' ? 5 : 11;
              break;

            case 3:
              scalar.props.push(this.sourceToken);
              return _context9.abrupt("return");

            case 5:
              scalar.source = this.source; // block-scalar source includes trailing newline

              this.atNewLine = true;
              this.indent = 0;

              if (this.onNewLine) {
                nl = this.source.indexOf('\n') + 1;

                while (nl !== 0) {
                  this.onNewLine(this.offset + nl);
                  nl = this.source.indexOf('\n', nl) + 1;
                }
              }

              return _context9.delegateYield(this.pop(), "t1", 10);

            case 10:
              return _context9.abrupt("break", 13);

            case 11:
              return _context9.delegateYield(this.pop(), "t2", 12);

            case 12:
              return _context9.delegateYield(this.step(), "t3", 13);

            case 13:
            case "end":
              return _context9.stop();
          }
        }
      }, blockScalar, this);
    })
  }, {
    key: "blockMap",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function blockMap(map) {
      var it, _end, last, _prev$value, prev, _end2, atNextItem, start, nl, i, st, _start, _start2, key, sep, fs, bv;

      return _regeneratorRuntime().wrap(function blockMap$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              it = map.items[map.items.length - 1]; // it.sep is true-ish if pair already has key or : separator

              _context10.t0 = this.type;
              _context10.next = _context10.t0 === 'newline' ? 4 : _context10.t0 === 'space' ? 7 : _context10.t0 === 'comment' ? 7 : 25;
              break;

            case 4:
              this.onKeyLine = false;

              if (it.value) {
                _end = 'end' in it.value ? it.value.end : undefined;
                last = Array.isArray(_end) ? _end[_end.length - 1] : undefined;
                if ((last === null || last === void 0 ? void 0 : last.type) === 'comment') _end === null || _end === void 0 ? void 0 : _end.push(this.sourceToken);else map.items.push({
                  start: [this.sourceToken]
                });
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }

              return _context10.abrupt("return");

            case 7:
              if (!it.value) {
                _context10.next = 11;
                break;
              }

              map.items.push({
                start: [this.sourceToken]
              });
              _context10.next = 24;
              break;

            case 11:
              if (!it.sep) {
                _context10.next = 15;
                break;
              }

              it.sep.push(this.sourceToken);
              _context10.next = 24;
              break;

            case 15:
              if (!this.atIndentedComment(it.start, map.indent)) {
                _context10.next = 23;
                break;
              }

              prev = map.items[map.items.length - 2];
              _end2 = prev === null || prev === void 0 ? void 0 : (_prev$value = prev.value) === null || _prev$value === void 0 ? void 0 : _prev$value.end;

              if (!Array.isArray(_end2)) {
                _context10.next = 23;
                break;
              }

              Array.prototype.push.apply(_end2, it.start);

              _end2.push(this.sourceToken);

              map.items.pop();
              return _context10.abrupt("return");

            case 23:
              it.start.push(this.sourceToken);

            case 24:
              return _context10.abrupt("return");

            case 25:
              if (!(this.indent >= map.indent)) {
                _context10.next = 65;
                break;
              }

              atNextItem = !this.onKeyLine && this.indent === map.indent && it.sep; // For empty nodes, assign newline-separated not indented empty tokens to following node

              start = [];

              if (!(atNextItem && it.sep && !it.value)) {
                _context10.next = 46;
                break;
              }

              nl = [];
              i = 0;

            case 31:
              if (!(i < it.sep.length)) {
                _context10.next = 45;
                break;
              }

              st = it.sep[i];
              _context10.t1 = st.type;
              _context10.next = _context10.t1 === 'newline' ? 36 : _context10.t1 === 'space' ? 38 : _context10.t1 === 'comment' ? 39 : 41;
              break;

            case 36:
              nl.push(i);
              return _context10.abrupt("break", 42);

            case 38:
              return _context10.abrupt("break", 42);

            case 39:
              if (st.indent > map.indent) nl.length = 0;
              return _context10.abrupt("break", 42);

            case 41:
              nl.length = 0;

            case 42:
              ++i;
              _context10.next = 31;
              break;

            case 45:
              if (nl.length >= 2) start = it.sep.splice(nl[1]);

            case 46:
              _context10.t2 = this.type;
              _context10.next = _context10.t2 === 'anchor' ? 49 : _context10.t2 === 'tag' ? 49 : _context10.t2 === 'explicit-key-ind' ? 51 : _context10.t2 === 'map-value-ind' ? 54 : _context10.t2 === 'alias' ? 57 : _context10.t2 === 'scalar' ? 57 : _context10.t2 === 'single-quoted-scalar' ? 57 : _context10.t2 === 'double-quoted-scalar' ? 57 : 60;
              break;

            case 49:
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({
                  start: start
                });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }

              return _context10.abrupt("return");

            case 51:
              if (!it.sep && !includesToken(it.start, 'explicit-key-ind')) {
                it.start.push(this.sourceToken);
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({
                  start: start
                });
              } else {
                this.stack.push({
                  type: 'block-map',
                  offset: this.offset,
                  indent: this.indent,
                  items: [{
                    start: [this.sourceToken]
                  }]
                });
              }

              this.onKeyLine = true;
              return _context10.abrupt("return");

            case 54:
              if (includesToken(it.start, 'explicit-key-ind')) {
                if (!it.sep) {
                  if (includesToken(it.start, 'newline')) {
                    Object.assign(it, {
                      key: null,
                      sep: [this.sourceToken]
                    });
                  } else {
                    _start = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: 'block-map',
                      offset: this.offset,
                      indent: this.indent,
                      items: [{
                        start: _start,
                        key: null,
                        sep: [this.sourceToken]
                      }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({
                    start: [],
                    key: null,
                    sep: [this.sourceToken]
                  });
                } else if (includesToken(it.sep, 'map-value-ind')) {
                  this.stack.push({
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{
                      start: start,
                      key: null,
                      sep: [this.sourceToken]
                    }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, 'newline')) {
                  _start2 = getFirstKeyStartProps(it.start);
                  key = it.key;
                  sep = it.sep;
                  sep.push(this.sourceToken); // @ts-expect-error type guard is wrong here

                  delete it.key, delete it.sep;
                  this.stack.push({
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{
                      start: _start2,
                      key: key,
                      sep: sep
                    }]
                  });
                } else if (start.length > 0) {
                  // Not actually at next item
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, {
                    key: null,
                    sep: [this.sourceToken]
                  });
                } else if (it.value || atNextItem) {
                  map.items.push({
                    start: start,
                    key: null,
                    sep: [this.sourceToken]
                  });
                } else if (includesToken(it.sep, 'map-value-ind')) {
                  this.stack.push({
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{
                      start: [],
                      key: null,
                      sep: [this.sourceToken]
                    }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }

              this.onKeyLine = true;
              return _context10.abrupt("return");

            case 57:
              fs = this.flowScalar(this.type);

              if (atNextItem || it.value) {
                map.items.push({
                  start: start,
                  key: fs,
                  sep: []
                });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, {
                  key: fs,
                  sep: []
                });
                this.onKeyLine = true;
              }

              return _context10.abrupt("return");

            case 60:
              bv = this.startBlockValue(map);

              if (!bv) {
                _context10.next = 65;
                break;
              }

              if (atNextItem && bv.type !== 'block-seq' && includesToken(it.start, 'explicit-key-ind')) {
                map.items.push({
                  start: start
                });
              }

              this.stack.push(bv);
              return _context10.abrupt("return");

            case 65:
              return _context10.delegateYield(this.pop(), "t3", 66);

            case 66:
              return _context10.delegateYield(this.step(), "t4", 67);

            case 67:
            case "end":
              return _context10.stop();
          }
        }
      }, blockMap, this);
    })
  }, {
    key: "blockSequence",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function blockSequence(seq) {
      var it, _end3, last, _prev$value2, prev, _end4, bv;

      return _regeneratorRuntime().wrap(function blockSequence$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              it = seq.items[seq.items.length - 1];
              _context11.t0 = this.type;
              _context11.next = _context11.t0 === 'newline' ? 4 : _context11.t0 === 'space' ? 6 : _context11.t0 === 'comment' ? 6 : _context11.t0 === 'anchor' ? 20 : _context11.t0 === 'tag' ? 20 : _context11.t0 === 'seq-item-ind' ? 24 : 28;
              break;

            case 4:
              if (it.value) {
                _end3 = 'end' in it.value ? it.value.end : undefined;
                last = Array.isArray(_end3) ? _end3[_end3.length - 1] : undefined;
                if ((last === null || last === void 0 ? void 0 : last.type) === 'comment') _end3 === null || _end3 === void 0 ? void 0 : _end3.push(this.sourceToken);else seq.items.push({
                  start: [this.sourceToken]
                });
              } else it.start.push(this.sourceToken);

              return _context11.abrupt("return");

            case 6:
              if (!it.value) {
                _context11.next = 10;
                break;
              }

              seq.items.push({
                start: [this.sourceToken]
              });
              _context11.next = 19;
              break;

            case 10:
              if (!this.atIndentedComment(it.start, seq.indent)) {
                _context11.next = 18;
                break;
              }

              prev = seq.items[seq.items.length - 2];
              _end4 = prev === null || prev === void 0 ? void 0 : (_prev$value2 = prev.value) === null || _prev$value2 === void 0 ? void 0 : _prev$value2.end;

              if (!Array.isArray(_end4)) {
                _context11.next = 18;
                break;
              }

              Array.prototype.push.apply(_end4, it.start);

              _end4.push(this.sourceToken);

              seq.items.pop();
              return _context11.abrupt("return");

            case 18:
              it.start.push(this.sourceToken);

            case 19:
              return _context11.abrupt("return");

            case 20:
              if (!(it.value || this.indent <= seq.indent)) {
                _context11.next = 22;
                break;
              }

              return _context11.abrupt("break", 28);

            case 22:
              it.start.push(this.sourceToken);
              return _context11.abrupt("return");

            case 24:
              if (!(this.indent !== seq.indent)) {
                _context11.next = 26;
                break;
              }

              return _context11.abrupt("break", 28);

            case 26:
              if (it.value || includesToken(it.start, 'seq-item-ind')) seq.items.push({
                start: [this.sourceToken]
              });else it.start.push(this.sourceToken);
              return _context11.abrupt("return");

            case 28:
              if (!(this.indent > seq.indent)) {
                _context11.next = 33;
                break;
              }

              bv = this.startBlockValue(seq);

              if (!bv) {
                _context11.next = 33;
                break;
              }

              this.stack.push(bv);
              return _context11.abrupt("return");

            case 33:
              return _context11.delegateYield(this.pop(), "t1", 34);

            case 34:
              return _context11.delegateYield(this.step(), "t2", 35);

            case 35:
            case "end":
              return _context11.stop();
          }
        }
      }, blockSequence, this);
    })
  }, {
    key: "flowCollection",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function flowCollection(fc) {
      var it, top, fs, bv, parent, prev, start, sep, map;
      return _regeneratorRuntime().wrap(function flowCollection$(_context12) {
        while (1) {
          switch (_context12.prev = _context12.next) {
            case 0:
              it = fc.items[fc.items.length - 1];

              if (!(this.type === 'flow-error-end')) {
                _context12.next = 7;
                break;
              }

            case 2:
              return _context12.delegateYield(this.pop(), "t0", 3);

            case 3:
              top = this.peek(1);

            case 4:
              if (top && top.type === 'flow-collection') {
                _context12.next = 2;
                break;
              }

            case 5:
              _context12.next = 49;
              break;

            case 7:
              if (!(fc.end.length === 0)) {
                _context12.next = 31;
                break;
              }

              _context12.t1 = this.type;
              _context12.next = _context12.t1 === 'comma' ? 11 : _context12.t1 === 'explicit-key-ind' ? 11 : _context12.t1 === 'map-value-ind' ? 13 : _context12.t1 === 'space' ? 15 : _context12.t1 === 'comment' ? 15 : _context12.t1 === 'newline' ? 15 : _context12.t1 === 'anchor' ? 15 : _context12.t1 === 'tag' ? 15 : _context12.t1 === 'alias' ? 17 : _context12.t1 === 'scalar' ? 17 : _context12.t1 === 'single-quoted-scalar' ? 17 : _context12.t1 === 'double-quoted-scalar' ? 17 : _context12.t1 === 'flow-map-end' ? 20 : _context12.t1 === 'flow-seq-end' ? 20 : 22;
              break;

            case 11:
              if (!it || it.sep) fc.items.push({
                start: [this.sourceToken]
              });else it.start.push(this.sourceToken);
              return _context12.abrupt("return");

            case 13:
              if (!it || it.value) fc.items.push({
                start: [],
                key: null,
                sep: [this.sourceToken]
              });else if (it.sep) it.sep.push(this.sourceToken);else Object.assign(it, {
                key: null,
                sep: [this.sourceToken]
              });
              return _context12.abrupt("return");

            case 15:
              if (!it || it.value) fc.items.push({
                start: [this.sourceToken]
              });else if (it.sep) it.sep.push(this.sourceToken);else it.start.push(this.sourceToken);
              return _context12.abrupt("return");

            case 17:
              fs = this.flowScalar(this.type);
              if (!it || it.value) fc.items.push({
                start: [],
                key: fs,
                sep: []
              });else if (it.sep) this.stack.push(fs);else Object.assign(it, {
                key: fs,
                sep: []
              });
              return _context12.abrupt("return");

            case 20:
              fc.end.push(this.sourceToken);
              return _context12.abrupt("return");

            case 22:
              bv = this.startBlockValue(fc);
              /* istanbul ignore else should not happen */

              if (!bv) {
                _context12.next = 27;
                break;
              }

              this.stack.push(bv);
              _context12.next = 29;
              break;

            case 27:
              return _context12.delegateYield(this.pop(), "t2", 28);

            case 28:
              return _context12.delegateYield(this.step(), "t3", 29);

            case 29:
              _context12.next = 49;
              break;

            case 31:
              parent = this.peek(2);

              if (!(parent.type === 'block-map' && (this.type === 'map-value-ind' && parent.indent === fc.indent || this.type === 'newline' && !parent.items[parent.items.length - 1].sep))) {
                _context12.next = 37;
                break;
              }

              return _context12.delegateYield(this.pop(), "t4", 34);

            case 34:
              return _context12.delegateYield(this.step(), "t5", 35);

            case 35:
              _context12.next = 49;
              break;

            case 37:
              if (!(this.type === 'map-value-ind' && parent.type !== 'flow-collection')) {
                _context12.next = 48;
                break;
              }

              prev = getPrevProps(parent);
              start = getFirstKeyStartProps(prev);
              fixFlowSeqItems(fc);
              sep = fc.end.splice(1, fc.end.length);
              sep.push(this.sourceToken);
              map = {
                type: 'block-map',
                offset: fc.offset,
                indent: fc.indent,
                items: [{
                  start: start,
                  key: fc,
                  sep: sep
                }]
              };
              this.onKeyLine = true;
              this.stack[this.stack.length - 1] = map;
              _context12.next = 49;
              break;

            case 48:
              return _context12.delegateYield(this.lineEnd(fc), "t6", 49);

            case 49:
            case "end":
              return _context12.stop();
          }
        }
      }, flowCollection, this);
    })
  }, {
    key: "flowScalar",
    value: function flowScalar(type) {
      if (this.onNewLine) {
        var nl = this.source.indexOf('\n') + 1;

        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf('\n', nl) + 1;
        }
      }

      return {
        type: type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
  }, {
    key: "startBlockValue",
    value: function startBlockValue(parent) {
      switch (this.type) {
        case 'alias':
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
          return this.flowScalar(this.type);

        case 'block-scalar-header':
          return {
            type: 'block-scalar',
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ''
          };

        case 'flow-map-start':
        case 'flow-seq-start':
          return {
            type: 'flow-collection',
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };

        case 'seq-item-ind':
          return {
            type: 'block-seq',
            offset: this.offset,
            indent: this.indent,
            items: [{
              start: [this.sourceToken]
            }]
          };

        case 'explicit-key-ind':
          {
            this.onKeyLine = true;
            var prev = getPrevProps(parent);
            var start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: 'block-map',
              offset: this.offset,
              indent: this.indent,
              items: [{
                start: start
              }]
            };
          }

        case 'map-value-ind':
          {
            this.onKeyLine = true;

            var _prev = getPrevProps(parent);

            var _start3 = getFirstKeyStartProps(_prev);

            return {
              type: 'block-map',
              offset: this.offset,
              indent: this.indent,
              items: [{
                start: _start3,
                key: null,
                sep: [this.sourceToken]
              }]
            };
          }
      }

      return null;
    }
  }, {
    key: "atIndentedComment",
    value: function atIndentedComment(start, indent) {
      if (this.type !== 'comment') return false;
      if (this.indent <= indent) return false;
      return start.every(function (st) {
        return st.type === 'newline' || st.type === 'space';
      });
    }
  }, {
    key: "documentEnd",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function documentEnd(docEnd) {
      return _regeneratorRuntime().wrap(function documentEnd$(_context13) {
        while (1) {
          switch (_context13.prev = _context13.next) {
            case 0:
              if (!(this.type !== 'doc-mode')) {
                _context13.next = 4;
                break;
              }

              if (docEnd.end) docEnd.end.push(this.sourceToken);else docEnd.end = [this.sourceToken];

              if (!(this.type === 'newline')) {
                _context13.next = 4;
                break;
              }

              return _context13.delegateYield(this.pop(), "t0", 4);

            case 4:
            case "end":
              return _context13.stop();
          }
        }
      }, documentEnd, this);
    })
  }, {
    key: "lineEnd",
    value: /*#__PURE__*/_regeneratorRuntime().mark(function lineEnd(token) {
      return _regeneratorRuntime().wrap(function lineEnd$(_context14) {
        while (1) {
          switch (_context14.prev = _context14.next) {
            case 0:
              _context14.t0 = this.type;
              _context14.next = _context14.t0 === 'comma' ? 3 : _context14.t0 === 'doc-start' ? 3 : _context14.t0 === 'doc-end' ? 3 : _context14.t0 === 'flow-seq-end' ? 3 : _context14.t0 === 'flow-map-end' ? 3 : _context14.t0 === 'map-value-ind' ? 3 : _context14.t0 === 'newline' ? 6 : _context14.t0 === 'space' ? 7 : _context14.t0 === 'comment' ? 7 : 7;
              break;

            case 3:
              return _context14.delegateYield(this.pop(), "t1", 4);

            case 4:
              return _context14.delegateYield(this.step(), "t2", 5);

            case 5:
              return _context14.abrupt("break", 10);

            case 6:
              this.onKeyLine = false;

            case 7:
              // all other values are errors
              if (token.end) token.end.push(this.sourceToken);else token.end = [this.sourceToken];

              if (!(this.type === 'newline')) {
                _context14.next = 10;
                break;
              }

              return _context14.delegateYield(this.pop(), "t3", 10);

            case 10:
            case "end":
              return _context14.stop();
          }
        }
      }, lineEnd, this);
    })
  }]);

  return Parser;
}();

exports.Parser = Parser;

},{"./cst.js":41,"./lexer.js":42}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = parse;
exports.parseAllDocuments = parseAllDocuments;
exports.parseDocument = parseDocument;
exports.stringify = stringify;

var _composer = require("./compose/composer.js");

var _Document = require("./doc/Document.js");

var _errors = require("./errors.js");

var _log = require("./log.js");

var _lineCounter = require("./parse/line-counter.js");

var _parser = require("./parse/parser.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function parseOptions(options) {
  var prettyErrors = options.prettyErrors !== false;
  var lineCounter = options.lineCounter || prettyErrors && new _lineCounter.LineCounter() || null;
  return {
    lineCounter: lineCounter,
    prettyErrors: prettyErrors
  };
}
/**
 * Parse the input as a stream of YAML documents.
 *
 * Documents should be separated from each other by `...` or `---` marker lines.
 *
 * @returns If an empty `docs` array is returned, it will be of type
 *   EmptyStream and contain additional stream information. In
 *   TypeScript, you should use `'empty' in docs` as a type guard for it.
 */


function parseAllDocuments(source) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _parseOptions = parseOptions(options),
      lineCounter = _parseOptions.lineCounter,
      prettyErrors = _parseOptions.prettyErrors;

  var parser = new _parser.Parser(lineCounter === null || lineCounter === void 0 ? void 0 : lineCounter.addNewLine);
  var composer = new _composer.Composer(options);
  var docs = Array.from(composer.compose(parser.parse(source)));

  if (prettyErrors && lineCounter) {
    var _iterator = _createForOfIteratorHelper(docs),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var doc = _step.value;
        doc.errors.forEach((0, _errors.prettifyError)(source, lineCounter));
        doc.warnings.forEach((0, _errors.prettifyError)(source, lineCounter));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  if (docs.length > 0) return docs;
  return Object.assign([], {
    empty: true
  }, composer.streamInfo());
}
/** Parse an input string into a single YAML.Document */


function parseDocument(source) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _parseOptions2 = parseOptions(options),
      lineCounter = _parseOptions2.lineCounter,
      prettyErrors = _parseOptions2.prettyErrors;

  var parser = new _parser.Parser(lineCounter === null || lineCounter === void 0 ? void 0 : lineCounter.addNewLine);
  var composer = new _composer.Composer(options); // `doc` is always set by compose.end(true) at the very latest

  var doc = null;

  var _iterator2 = _createForOfIteratorHelper(composer.compose(parser.parse(source), true, source.length)),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var _doc = _step2.value;
      if (!doc) doc = _doc;else if (doc.options.logLevel !== 'silent') {
        doc.errors.push(new _errors.YAMLParseError(_doc.range.slice(0, 2), 'MULTIPLE_DOCS', 'Source contains multiple documents; please use YAML.parseAllDocuments()'));
        break;
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

  if (prettyErrors && lineCounter) {
    doc.errors.forEach((0, _errors.prettifyError)(source, lineCounter));
    doc.warnings.forEach((0, _errors.prettifyError)(source, lineCounter));
  }

  return doc;
}

function parse(src, reviver, options) {
  var _reviver = undefined;

  if (typeof reviver === 'function') {
    _reviver = reviver;
  } else if (options === undefined && reviver && _typeof(reviver) === 'object') {
    options = reviver;
  }

  var doc = parseDocument(src, options);
  if (!doc) return null;
  doc.warnings.forEach(function (warning) {
    return (0, _log.warn)(doc.options.logLevel, warning);
  });

  if (doc.errors.length > 0) {
    if (doc.options.logLevel !== 'silent') throw doc.errors[0];else doc.errors = [];
  }

  return doc.toJS(Object.assign({
    reviver: _reviver
  }, options));
}

function stringify(value, replacer, options) {
  var _replacer = null;

  if (typeof replacer === 'function' || Array.isArray(replacer)) {
    _replacer = replacer;
  } else if (options === undefined && replacer) {
    options = replacer;
  }

  if (typeof options === 'string') options = options.length;

  if (typeof options === 'number') {
    var indent = Math.round(options);
    options = indent < 1 ? undefined : indent > 8 ? {
      indent: 8
    } : {
      indent: indent
    };
  }

  if (value === undefined) {
    var _ref2, _options;

    var _ref = (_ref2 = (_options = options) !== null && _options !== void 0 ? _options : replacer) !== null && _ref2 !== void 0 ? _ref2 : {},
        keepUndefined = _ref.keepUndefined;

    if (!keepUndefined) return undefined;
  }

  return new _Document.Document(value, _replacer, options).toString(options);
}

},{"./compose/composer.js":9,"./doc/Document.js":21,"./errors.js":26,"./log.js":28,"./parse/line-counter.js":43,"./parse/parser.js":44}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Schema = void 0;

var _Node = require("../nodes/Node.js");

var _map = require("./common/map.js");

var _seq = require("./common/seq.js");

var _string = require("./common/string.js");

var _tags = require("./tags.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var sortMapEntriesByKey = function sortMapEntriesByKey(a, b) {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

var Schema = /*#__PURE__*/function () {
  function Schema(_ref) {
    var compat = _ref.compat,
        customTags = _ref.customTags,
        merge = _ref.merge,
        resolveKnownTags = _ref.resolveKnownTags,
        schema = _ref.schema,
        sortMapEntries = _ref.sortMapEntries,
        toStringDefaults = _ref.toStringDefaults;

    _classCallCheck(this, Schema);

    this.compat = Array.isArray(compat) ? (0, _tags.getTags)(compat, 'compat') : compat ? (0, _tags.getTags)(null, compat) : null;
    this.merge = !!merge;
    this.name = typeof schema === 'string' && schema || 'core';
    this.knownTags = resolveKnownTags ? _tags.coreKnownTags : {};
    this.tags = (0, _tags.getTags)(customTags, this.name);
    this.toStringOptions = toStringDefaults !== null && toStringDefaults !== void 0 ? toStringDefaults : null;
    Object.defineProperty(this, _Node.MAP, {
      value: _map.map
    });
    Object.defineProperty(this, _Node.SCALAR, {
      value: _string.string
    });
    Object.defineProperty(this, _Node.SEQ, {
      value: _seq.seq
    }); // Used by createMap()

    this.sortMapEntries = typeof sortMapEntries === 'function' ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
  }

  _createClass(Schema, [{
    key: "clone",
    value: function clone() {
      var copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }]);

  return Schema;
}();

exports.Schema = Schema;

},{"../nodes/Node.js":31,"./common/map.js":47,"./common/seq.js":49,"./common/string.js":50,"./tags.js":56}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.map = void 0;

var _Node = require("../../nodes/Node.js");

var _Pair = require("../../nodes/Pair.js");

var _YAMLMap = require("../../nodes/YAMLMap.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function createMap(schema, obj, ctx) {
  var keepUndefined = ctx.keepUndefined,
      replacer = ctx.replacer;
  var map = new _YAMLMap.YAMLMap(schema);

  var add = function add(key, value) {
    if (typeof replacer === 'function') value = replacer.call(obj, key, value);else if (Array.isArray(replacer) && !replacer.includes(key)) return;
    if (value !== undefined || keepUndefined) map.items.push((0, _Pair.createPair)(key, value, ctx));
  };

  if (obj instanceof Map) {
    var _iterator = _createForOfIteratorHelper(obj),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _step$value = _slicedToArray(_step.value, 2),
            key = _step$value[0],
            value = _step$value[1];

        add(key, value);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (obj && _typeof(obj) === 'object') {
    for (var _i2 = 0, _Object$keys = Object.keys(obj); _i2 < _Object$keys.length; _i2++) {
      var _key = _Object$keys[_i2];
      add(_key, obj[_key]);
    }
  }

  if (typeof schema.sortMapEntries === 'function') {
    map.items.sort(schema.sortMapEntries);
  }

  return map;
}

var map = {
  collection: 'map',
  createNode: createMap,
  "default": true,
  nodeClass: _YAMLMap.YAMLMap,
  tag: 'tag:yaml.org,2002:map',
  resolve: function resolve(map, onError) {
    if (!(0, _Node.isMap)(map)) onError('Expected a mapping for this tag');
    return map;
  }
};
exports.map = map;

},{"../../nodes/Node.js":31,"../../nodes/Pair.js":32,"../../nodes/YAMLMap.js":34}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nullTag = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var nullTag = {
  identify: function identify(value) {
    return value == null;
  },
  createNode: function createNode() {
    return new _Scalar.Scalar(null);
  },
  "default": true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: function resolve() {
    return new _Scalar.Scalar(null);
  },
  stringify: function stringify(_ref, ctx) {
    var source = _ref.source;
    return typeof source === 'string' && nullTag.test.test(source) ? source : ctx.options.nullStr;
  }
};
exports.nullTag = nullTag;

},{"../../nodes/Scalar.js":33}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.seq = void 0;

var _createNode = require("../../doc/createNode.js");

var _Node = require("../../nodes/Node.js");

var _YAMLSeq = require("../../nodes/YAMLSeq.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function createSeq(schema, obj, ctx) {
  var replacer = ctx.replacer;
  var seq = new _YAMLSeq.YAMLSeq(schema);

  if (obj && Symbol.iterator in Object(obj)) {
    var i = 0;

    var _iterator = _createForOfIteratorHelper(obj),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var it = _step.value;

        if (typeof replacer === 'function') {
          var key = obj instanceof Set ? it : String(i++);
          it = replacer.call(obj, key, it);
        }

        seq.items.push((0, _createNode.createNode)(it, undefined, ctx));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return seq;
}

var seq = {
  collection: 'seq',
  createNode: createSeq,
  "default": true,
  nodeClass: _YAMLSeq.YAMLSeq,
  tag: 'tag:yaml.org,2002:seq',
  resolve: function resolve(seq, onError) {
    if (!(0, _Node.isSeq)(seq)) onError('Expected a sequence for this tag');
    return seq;
  }
};
exports.seq = seq;

},{"../../doc/createNode.js":24,"../../nodes/Node.js":31,"../../nodes/YAMLSeq.js":35}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.string = void 0;

var _stringifyString = require("../../stringify/stringifyString.js");

var string = {
  identify: function identify(value) {
    return typeof value === 'string';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:str',
  resolve: function resolve(str) {
    return str;
  },
  stringify: function stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({
      actualString: true
    }, ctx);
    return (0, _stringifyString.stringifyString)(item, ctx, onComment, onChompKeep);
  }
};
exports.string = string;

},{"../../stringify/stringifyString.js":73}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.boolTag = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var boolTag = {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: function resolve(str) {
    return new _Scalar.Scalar(str[0] === 't' || str[0] === 'T');
  },
  stringify: function stringify(_ref, ctx) {
    var source = _ref.source,
        value = _ref.value;

    if (source && boolTag.test.test(source)) {
      var sv = source[0] === 't' || source[0] === 'T';
      if (value === sv) return source;
    }

    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
};
exports.boolTag = boolTag;

},{"../../nodes/Scalar.js":33}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.floatNaN = exports.floatExp = exports["float"] = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var _stringifyNumber = require("../../stringify/stringifyNumber.js");

var floatNaN = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN))$/,
  resolve: function resolve(str) {
    return str.slice(-3).toLowerCase() === 'nan' ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports.floatNaN = floatNaN;
var floatExp = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return parseFloat(str);
  },
  stringify: function stringify(node) {
    var num = Number(node.value);
    return isFinite(num) ? num.toExponential() : (0, _stringifyNumber.stringifyNumber)(node);
  }
};
exports.floatExp = floatExp;
var _float = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
  resolve: function resolve(str) {
    var node = new _Scalar.Scalar(parseFloat(str));
    var dot = str.indexOf('.');
    if (dot !== -1 && str[str.length - 1] === '0') node.minFractionDigits = str.length - dot - 1;
    return node;
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports["float"] = _float;

},{"../../nodes/Scalar.js":33,"../../stringify/stringifyNumber.js":71}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intOct = exports.intHex = exports["int"] = void 0;

var _stringifyNumber = require("../../stringify/stringifyNumber.js");

var intIdentify = function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
};

var intResolve = function intResolve(str, offset, radix, _ref) {
  var intAsBigInt = _ref.intAsBigInt;
  return intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
};

function intStringify(node, radix, prefix) {
  var value = node.value;
  if (intIdentify(value) && value >= 0) return prefix + value.toString(radix);
  return (0, _stringifyNumber.stringifyNumber)(node);
}

var intOct = {
  identify: function identify(value) {
    return intIdentify(value) && value >= 0;
  },
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^0o[0-7]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 2, 8, opt);
  },
  stringify: function stringify(node) {
    return intStringify(node, 8, '0o');
  }
};
exports.intOct = intOct;
var _int = {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 0, 10, opt);
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports["int"] = _int;
var intHex = {
  identify: function identify(value) {
    return intIdentify(value) && value >= 0;
  },
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^0x[0-9a-fA-F]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 2, 16, opt);
  },
  stringify: function stringify(node) {
    return intStringify(node, 16, '0x');
  }
};
exports.intHex = intHex;

},{"../../stringify/stringifyNumber.js":71}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schema = void 0;

var _map = require("../common/map.js");

var _null = require("../common/null.js");

var _seq = require("../common/seq.js");

var _string = require("../common/string.js");

var _bool = require("./bool.js");

var _float2 = require("./float.js");

var _int2 = require("./int.js");

var schema = [_map.map, _seq.seq, _string.string, _null.nullTag, _bool.boolTag, _int2.intOct, _int2["int"], _int2.intHex, _float2.floatNaN, _float2.floatExp, _float2["float"]];
exports.schema = schema;

},{"../common/map.js":47,"../common/null.js":48,"../common/seq.js":49,"../common/string.js":50,"./bool.js":51,"./float.js":52,"./int.js":53}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schema = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var _map = require("../common/map.js");

var _seq = require("../common/seq.js");

function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
}

var stringifyJSON = function stringifyJSON(_ref) {
  var value = _ref.value;
  return JSON.stringify(value);
};

var jsonScalars = [{
  identify: function identify(value) {
    return typeof value === 'string';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:str',
  resolve: function resolve(str) {
    return str;
  },
  stringify: stringifyJSON
}, {
  identify: function identify(value) {
    return value == null;
  },
  createNode: function createNode() {
    return new _Scalar.Scalar(null);
  },
  "default": true,
  tag: 'tag:yaml.org,2002:null',
  test: /^null$/,
  resolve: function resolve() {
    return null;
  },
  stringify: stringifyJSON
}, {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^true|false$/,
  resolve: function resolve(str) {
    return str === 'true';
  },
  stringify: stringifyJSON
}, {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  test: /^-?(?:0|[1-9][0-9]*)$/,
  resolve: function resolve(str, _onError, _ref2) {
    var intAsBigInt = _ref2.intAsBigInt;
    return intAsBigInt ? BigInt(str) : parseInt(str, 10);
  },
  stringify: function stringify(_ref3) {
    var value = _ref3.value;
    return intIdentify(value) ? value.toString() : JSON.stringify(value);
  }
}, {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
  resolve: function resolve(str) {
    return parseFloat(str);
  },
  stringify: stringifyJSON
}];
var jsonError = {
  "default": true,
  tag: '',
  test: /^/,
  resolve: function resolve(str, onError) {
    onError("Unresolved plain scalar ".concat(JSON.stringify(str)));
    return str;
  }
};
var schema = [_map.map, _seq.seq].concat(jsonScalars, jsonError);
exports.schema = schema;

},{"../../nodes/Scalar.js":33,"../common/map.js":47,"../common/seq.js":49}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.coreKnownTags = void 0;
exports.getTags = getTags;

var _map = require("./common/map.js");

var _null = require("./common/null.js");

var _seq = require("./common/seq.js");

var _string = require("./common/string.js");

var _bool = require("./core/bool.js");

var _float2 = require("./core/float.js");

var _int2 = require("./core/int.js");

var _schema = require("./core/schema.js");

var _schema2 = require("./json/schema.js");

var _binary = require("./yaml-1.1/binary.js");

var _omap = require("./yaml-1.1/omap.js");

var _pairs = require("./yaml-1.1/pairs.js");

var _schema3 = require("./yaml-1.1/schema.js");

var _set = require("./yaml-1.1/set.js");

var _timestamp = require("./yaml-1.1/timestamp.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var schemas = new Map([['core', _schema.schema], ['failsafe', [_map.map, _seq.seq, _string.string]], ['json', _schema2.schema], ['yaml11', _schema3.schema], ['yaml-1.1', _schema3.schema]]);
var tagsByName = {
  binary: _binary.binary,
  bool: _bool.boolTag,
  "float": _float2["float"],
  floatExp: _float2.floatExp,
  floatNaN: _float2.floatNaN,
  floatTime: _timestamp.floatTime,
  "int": _int2["int"],
  intHex: _int2.intHex,
  intOct: _int2.intOct,
  intTime: _timestamp.intTime,
  map: _map.map,
  "null": _null.nullTag,
  omap: _omap.omap,
  pairs: _pairs.pairs,
  seq: _seq.seq,
  set: _set.set,
  timestamp: _timestamp.timestamp
};
var coreKnownTags = {
  'tag:yaml.org,2002:binary': _binary.binary,
  'tag:yaml.org,2002:omap': _omap.omap,
  'tag:yaml.org,2002:pairs': _pairs.pairs,
  'tag:yaml.org,2002:set': _set.set,
  'tag:yaml.org,2002:timestamp': _timestamp.timestamp
};
exports.coreKnownTags = coreKnownTags;

function getTags(customTags, schemaName) {
  var tags = schemas.get(schemaName);

  if (!tags) {
    if (Array.isArray(customTags)) tags = [];else {
      var keys = Array.from(schemas.keys()).filter(function (key) {
        return key !== 'yaml11';
      }).map(function (key) {
        return JSON.stringify(key);
      }).join(', ');
      throw new Error("Unknown schema \"".concat(schemaName, "\"; use one of ").concat(keys, " or define customTags array"));
    }
  }

  if (Array.isArray(customTags)) {
    var _iterator = _createForOfIteratorHelper(customTags),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var tag = _step.value;
        tags = tags.concat(tag);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (typeof customTags === 'function') {
    tags = customTags(tags.slice());
  }

  return tags.map(function (tag) {
    if (typeof tag !== 'string') return tag;
    var tagObj = tagsByName[tag];
    if (tagObj) return tagObj;
    var keys = Object.keys(tagsByName).map(function (key) {
      return JSON.stringify(key);
    }).join(', ');
    throw new Error("Unknown custom tag \"".concat(tag, "\"; use one of ").concat(keys));
  });
}

},{"./common/map.js":47,"./common/null.js":48,"./common/seq.js":49,"./common/string.js":50,"./core/bool.js":51,"./core/float.js":52,"./core/int.js":53,"./core/schema.js":54,"./json/schema.js":55,"./yaml-1.1/binary.js":57,"./yaml-1.1/omap.js":61,"./yaml-1.1/pairs.js":62,"./yaml-1.1/schema.js":63,"./yaml-1.1/set.js":64,"./yaml-1.1/timestamp.js":65}],57:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.binary = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var _stringifyString = require("../../stringify/stringifyString.js");

var binary = {
  identify: function identify(value) {
    return value instanceof Uint8Array;
  },
  "default": false,
  tag: 'tag:yaml.org,2002:binary',

  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve: function resolve(src, onError) {
    if (typeof Buffer === 'function') {
      return Buffer.from(src, 'base64');
    } else if (typeof atob === 'function') {
      // On IE 11, atob() can't handle newlines
      var str = atob(src.replace(/[\n\r]/g, ''));
      var buffer = new Uint8Array(str.length);

      for (var i = 0; i < str.length; ++i) {
        buffer[i] = str.charCodeAt(i);
      }

      return buffer;
    } else {
      onError('This environment does not support reading binary tags; either Buffer or atob is required');
      return src;
    }
  },
  stringify: function stringify(_ref, ctx, onComment, onChompKeep) {
    var comment = _ref.comment,
        type = _ref.type,
        value = _ref.value;
    var buf = value; // checked earlier by binary.identify()

    var str;

    if (typeof Buffer === 'function') {
      str = buf instanceof Buffer ? buf.toString('base64') : Buffer.from(buf.buffer).toString('base64');
    } else if (typeof btoa === 'function') {
      var s = '';

      for (var i = 0; i < buf.length; ++i) {
        s += String.fromCharCode(buf[i]);
      }

      str = btoa(s);
    } else {
      throw new Error('This environment does not support writing binary tags; either Buffer or btoa is required');
    }

    if (!type) type = _Scalar.Scalar.BLOCK_LITERAL;

    if (type !== _Scalar.Scalar.QUOTE_DOUBLE) {
      var lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
      var n = Math.ceil(str.length / lineWidth);
      var lines = new Array(n);

      for (var _i = 0, o = 0; _i < n; ++_i, o += lineWidth) {
        lines[_i] = str.substr(o, lineWidth);
      }

      str = lines.join(type === _Scalar.Scalar.BLOCK_LITERAL ? '\n' : ' ');
    }

    return (0, _stringifyString.stringifyString)({
      comment: comment,
      type: type,
      value: str
    }, ctx, onComment, onChompKeep);
  }
};
exports.binary = binary;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../../nodes/Scalar.js":33,"../../stringify/stringifyString.js":73,"buffer":2}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.trueTag = exports.falseTag = void 0;

var _Scalar = require("../../nodes/Scalar.js");

function boolStringify(_ref, ctx) {
  var value = _ref.value,
      source = _ref.source;
  var boolObj = value ? trueTag : falseTag;
  if (source && boolObj.test.test(source)) return source;
  return value ? ctx.options.trueStr : ctx.options.falseStr;
}

var trueTag = {
  identify: function identify(value) {
    return value === true;
  },
  "default": true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: function resolve() {
    return new _Scalar.Scalar(true);
  },
  stringify: boolStringify
};
exports.trueTag = trueTag;
var falseTag = {
  identify: function identify(value) {
    return value === false;
  },
  "default": true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/i,
  resolve: function resolve() {
    return new _Scalar.Scalar(false);
  },
  stringify: boolStringify
};
exports.falseTag = falseTag;

},{"../../nodes/Scalar.js":33}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.floatNaN = exports.floatExp = exports["float"] = void 0;

var _Scalar = require("../../nodes/Scalar.js");

var _stringifyNumber = require("../../stringify/stringifyNumber.js");

var floatNaN = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?\.(?:inf|Inf|INF|nan|NaN|NAN)$/,
  resolve: function resolve(str) {
    return str.slice(-3).toLowerCase() === 'nan' ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports.floatNaN = floatNaN;
var floatExp = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return parseFloat(str.replace(/_/g, ''));
  },
  stringify: function stringify(node) {
    var num = Number(node.value);
    return isFinite(num) ? num.toExponential() : (0, _stringifyNumber.stringifyNumber)(node);
  }
};
exports.floatExp = floatExp;
var _float = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
  resolve: function resolve(str) {
    var node = new _Scalar.Scalar(parseFloat(str.replace(/_/g, '')));
    var dot = str.indexOf('.');

    if (dot !== -1) {
      var f = str.substring(dot + 1).replace(/_/g, '');
      if (f[f.length - 1] === '0') node.minFractionDigits = f.length;
    }

    return node;
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports["float"] = _float;

},{"../../nodes/Scalar.js":33,"../../stringify/stringifyNumber.js":71}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intOct = exports.intHex = exports.intBin = exports["int"] = void 0;

var _stringifyNumber = require("../../stringify/stringifyNumber.js");

var intIdentify = function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
};

function intResolve(str, offset, radix, _ref) {
  var intAsBigInt = _ref.intAsBigInt;
  var sign = str[0];
  if (sign === '-' || sign === '+') offset += 1;
  str = str.substring(offset).replace(/_/g, '');

  if (intAsBigInt) {
    switch (radix) {
      case 2:
        str = "0b".concat(str);
        break;

      case 8:
        str = "0o".concat(str);
        break;

      case 16:
        str = "0x".concat(str);
        break;
    }

    var _n = BigInt(str);

    return sign === '-' ? BigInt(-1) * _n : _n;
  }

  var n = parseInt(str, radix);
  return sign === '-' ? -1 * n : n;
}

function intStringify(node, radix, prefix) {
  var value = node.value;

  if (intIdentify(value)) {
    var str = value.toString(radix);
    return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
  }

  return (0, _stringifyNumber.stringifyNumber)(node);
}

var intBin = {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'BIN',
  test: /^[-+]?0b[0-1_]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 2, 2, opt);
  },
  stringify: function stringify(node) {
    return intStringify(node, 2, '0b');
  }
};
exports.intBin = intBin;
var intOct = {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^[-+]?0[0-7_]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 1, 8, opt);
  },
  stringify: function stringify(node) {
    return intStringify(node, 8, '0');
  }
};
exports.intOct = intOct;
var _int = {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 0, 10, opt);
  },
  stringify: _stringifyNumber.stringifyNumber
};
exports["int"] = _int;
var intHex = {
  identify: intIdentify,
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: function resolve(str, _onError, opt) {
    return intResolve(str, 2, 16, opt);
  },
  stringify: function stringify(node) {
    return intStringify(node, 16, '0x');
  }
};
exports.intHex = intHex;

},{"../../stringify/stringifyNumber.js":71}],61:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.omap = exports.YAMLOMap = void 0;

var _YAMLSeq2 = require("../../nodes/YAMLSeq.js");

var _toJS = require("../../nodes/toJS.js");

var _Node = require("../../nodes/Node.js");

var _YAMLMap = require("../../nodes/YAMLMap.js");

var _pairs = require("./pairs.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var YAMLOMap = /*#__PURE__*/function (_YAMLSeq) {
  _inherits(YAMLOMap, _YAMLSeq);

  var _super = _createSuper(YAMLOMap);

  function YAMLOMap() {
    var _this;

    _classCallCheck(this, YAMLOMap);

    _this = _super.call(this);
    _this.add = _YAMLMap.YAMLMap.prototype.add.bind(_assertThisInitialized(_this));
    _this["delete"] = _YAMLMap.YAMLMap.prototype["delete"].bind(_assertThisInitialized(_this));
    _this.get = _YAMLMap.YAMLMap.prototype.get.bind(_assertThisInitialized(_this));
    _this.has = _YAMLMap.YAMLMap.prototype.has.bind(_assertThisInitialized(_this));
    _this.set = _YAMLMap.YAMLMap.prototype.set.bind(_assertThisInitialized(_this));
    _this.tag = YAMLOMap.tag;
    return _this;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */


  _createClass(YAMLOMap, [{
    key: "toJSON",
    value: function toJSON(_, ctx) {
      if (!ctx) return _get(_getPrototypeOf(YAMLOMap.prototype), "toJSON", this).call(this, _);
      var map = new Map();
      if (ctx !== null && ctx !== void 0 && ctx.onCreate) ctx.onCreate(map);

      var _iterator = _createForOfIteratorHelper(this.items),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var pair = _step.value;
          var key = void 0,
              value = void 0;

          if ((0, _Node.isPair)(pair)) {
            key = (0, _toJS.toJS)(pair.key, '', ctx);
            value = (0, _toJS.toJS)(pair.value, key, ctx);
          } else {
            key = (0, _toJS.toJS)(pair, '', ctx);
          }

          if (map.has(key)) throw new Error('Ordered maps must not include duplicate keys');
          map.set(key, value);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return map;
    }
  }]);

  return YAMLOMap;
}(_YAMLSeq2.YAMLSeq);

exports.YAMLOMap = YAMLOMap;
YAMLOMap.tag = 'tag:yaml.org,2002:omap';
var omap = {
  collection: 'seq',
  identify: function identify(value) {
    return value instanceof Map;
  },
  nodeClass: YAMLOMap,
  "default": false,
  tag: 'tag:yaml.org,2002:omap',
  resolve: function resolve(seq, onError) {
    var pairs = (0, _pairs.resolvePairs)(seq, onError);
    var seenKeys = [];

    var _iterator2 = _createForOfIteratorHelper(pairs.items),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var key = _step2.value.key;

        if ((0, _Node.isScalar)(key)) {
          if (seenKeys.includes(key.value)) {
            onError("Ordered maps must not include duplicate keys: ".concat(key.value));
          } else {
            seenKeys.push(key.value);
          }
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    return Object.assign(new YAMLOMap(), pairs);
  },
  createNode: function createNode(schema, iterable, ctx) {
    var pairs = (0, _pairs.createPairs)(schema, iterable, ctx);
    var omap = new YAMLOMap();
    omap.items = pairs.items;
    return omap;
  }
};
exports.omap = omap;

},{"../../nodes/Node.js":31,"../../nodes/YAMLMap.js":34,"../../nodes/YAMLSeq.js":35,"../../nodes/toJS.js":37,"./pairs.js":62}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPairs = createPairs;
exports.pairs = void 0;
exports.resolvePairs = resolvePairs;

var _Node = require("../../nodes/Node.js");

var _Pair = require("../../nodes/Pair.js");

var _Scalar = require("../../nodes/Scalar.js");

var _YAMLSeq = require("../../nodes/YAMLSeq.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function resolvePairs(seq, onError) {
  if ((0, _Node.isSeq)(seq)) {
    for (var i = 0; i < seq.items.length; ++i) {
      var item = seq.items[i];
      if ((0, _Node.isPair)(item)) continue;else if ((0, _Node.isMap)(item)) {
        if (item.items.length > 1) onError('Each pair must have its own sequence indicator');
        var pair = item.items[0] || new _Pair.Pair(new _Scalar.Scalar(null));
        if (item.commentBefore) pair.key.commentBefore = pair.key.commentBefore ? "".concat(item.commentBefore, "\n").concat(pair.key.commentBefore) : item.commentBefore;

        if (item.comment) {
          var _pair$value;

          var cn = (_pair$value = pair.value) !== null && _pair$value !== void 0 ? _pair$value : pair.key;
          cn.comment = cn.comment ? "".concat(item.comment, "\n").concat(cn.comment) : item.comment;
        }

        item = pair;
      }
      seq.items[i] = (0, _Node.isPair)(item) ? item : new _Pair.Pair(item);
    }
  } else onError('Expected a sequence for this tag');

  return seq;
}

function createPairs(schema, iterable, ctx) {
  var replacer = ctx.replacer;
  var pairs = new _YAMLSeq.YAMLSeq(schema);
  pairs.tag = 'tag:yaml.org,2002:pairs';
  var i = 0;

  if (iterable && Symbol.iterator in Object(iterable)) {
    var _iterator = _createForOfIteratorHelper(iterable),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var it = _step.value;
        if (typeof replacer === 'function') it = replacer.call(iterable, String(i++), it);
        var key = void 0,
            value = void 0;

        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else throw new TypeError("Expected [key, value] tuple: ".concat(it));
        } else if (it && it instanceof Object) {
          var keys = Object.keys(it);

          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else throw new TypeError("Expected { key: value } tuple: ".concat(it));
        } else {
          key = it;
        }

        pairs.items.push((0, _Pair.createPair)(key, value, ctx));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return pairs;
}

var pairs = {
  collection: 'seq',
  "default": false,
  tag: 'tag:yaml.org,2002:pairs',
  resolve: resolvePairs,
  createNode: createPairs
};
exports.pairs = pairs;

},{"../../nodes/Node.js":31,"../../nodes/Pair.js":32,"../../nodes/Scalar.js":33,"../../nodes/YAMLSeq.js":35}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schema = void 0;

var _map = require("../common/map.js");

var _null = require("../common/null.js");

var _seq = require("../common/seq.js");

var _string = require("../common/string.js");

var _binary = require("./binary.js");

var _bool = require("./bool.js");

var _float2 = require("./float.js");

var _int2 = require("./int.js");

var _omap = require("./omap.js");

var _pairs = require("./pairs.js");

var _set = require("./set.js");

var _timestamp = require("./timestamp.js");

var schema = [_map.map, _seq.seq, _string.string, _null.nullTag, _bool.trueTag, _bool.falseTag, _int2.intBin, _int2.intOct, _int2["int"], _int2.intHex, _float2.floatNaN, _float2.floatExp, _float2["float"], _binary.binary, _omap.omap, _pairs.pairs, _set.set, _timestamp.intTime, _timestamp.floatTime, _timestamp.timestamp];
exports.schema = schema;

},{"../common/map.js":47,"../common/null.js":48,"../common/seq.js":49,"../common/string.js":50,"./binary.js":57,"./bool.js":58,"./float.js":59,"./int.js":60,"./omap.js":61,"./pairs.js":62,"./set.js":64,"./timestamp.js":65}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.set = exports.YAMLSet = void 0;

var _Node = require("../../nodes/Node.js");

var _Pair = require("../../nodes/Pair.js");

var _YAMLMap2 = require("../../nodes/YAMLMap.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get.bind(); } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var YAMLSet = /*#__PURE__*/function (_YAMLMap) {
  _inherits(YAMLSet, _YAMLMap);

  var _super = _createSuper(YAMLSet);

  function YAMLSet(schema) {
    var _this;

    _classCallCheck(this, YAMLSet);

    _this = _super.call(this, schema);
    _this.tag = YAMLSet.tag;
    return _this;
  }

  _createClass(YAMLSet, [{
    key: "add",
    value: function add(key) {
      var pair;
      if ((0, _Node.isPair)(key)) pair = key;else if (key && _typeof(key) === 'object' && 'key' in key && 'value' in key && key.value === null) pair = new _Pair.Pair(key.key, null);else pair = new _Pair.Pair(key, null);
      var prev = (0, _YAMLMap2.findPair)(this.items, pair.key);
      if (!prev) this.items.push(pair);
    }
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */

  }, {
    key: "get",
    value: function get(key, keepPair) {
      var pair = (0, _YAMLMap2.findPair)(this.items, key);
      return !keepPair && (0, _Node.isPair)(pair) ? (0, _Node.isScalar)(pair.key) ? pair.key.value : pair.key : pair;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      if (typeof value !== 'boolean') throw new Error("Expected boolean value for set(key, value) in a YAML set, not ".concat(_typeof(value)));
      var prev = (0, _YAMLMap2.findPair)(this.items, key);

      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new _Pair.Pair(key));
      }
    }
  }, {
    key: "toJSON",
    value: function toJSON(_, ctx) {
      return _get(_getPrototypeOf(YAMLSet.prototype), "toJSON", this).call(this, _, ctx, Set);
    }
  }, {
    key: "toString",
    value: function toString(ctx, onComment, onChompKeep) {
      if (!ctx) return JSON.stringify(this);
      if (this.hasAllNullValues(true)) return _get(_getPrototypeOf(YAMLSet.prototype), "toString", this).call(this, Object.assign({}, ctx, {
        allNullValues: true
      }), onComment, onChompKeep);else throw new Error('Set items must all have null values');
    }
  }]);

  return YAMLSet;
}(_YAMLMap2.YAMLMap);

exports.YAMLSet = YAMLSet;
YAMLSet.tag = 'tag:yaml.org,2002:set';
var set = {
  collection: 'map',
  identify: function identify(value) {
    return value instanceof Set;
  },
  nodeClass: YAMLSet,
  "default": false,
  tag: 'tag:yaml.org,2002:set',
  resolve: function resolve(map, onError) {
    if ((0, _Node.isMap)(map)) {
      if (map.hasAllNullValues(true)) return Object.assign(new YAMLSet(), map);else onError('Set items must all have null values');
    } else onError('Expected a mapping for this tag');

    return map;
  },
  createNode: function createNode(schema, iterable, ctx) {
    var replacer = ctx.replacer;
    var set = new YAMLSet(schema);

    if (iterable && Symbol.iterator in Object(iterable)) {
      var _iterator = _createForOfIteratorHelper(iterable),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var value = _step.value;
          if (typeof replacer === 'function') value = replacer.call(iterable, value, value);
          set.items.push((0, _Pair.createPair)(value, null, ctx));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    return set;
  }
};
exports.set = set;

},{"../../nodes/Node.js":31,"../../nodes/Pair.js":32,"../../nodes/YAMLMap.js":34}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timestamp = exports.intTime = exports.floatTime = void 0;

var _stringifyNumber = require("../../stringify/stringifyNumber.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
  var sign = str[0];
  var parts = sign === '-' || sign === '+' ? str.substring(1) : str;

  var num = function num(n) {
    return asBigInt ? BigInt(n) : Number(n);
  };

  var res = parts.replace(/_/g, '').split(':').reduce(function (res, p) {
    return res * num(60) + num(p);
  }, num(0));
  return sign === '-' ? num(-1) * res : res;
}
/**
 * hhhh:mm:ss.sss
 *
 * Internal types handle bigint as number, because TS can't figure it out.
 */


function stringifySexagesimal(node) {
  var value = node.value;

  var num = function num(n) {
    return n;
  };

  if (typeof value === 'bigint') num = function num(n) {
    return BigInt(n);
  };else if (isNaN(value) || !isFinite(value)) return (0, _stringifyNumber.stringifyNumber)(node);
  var sign = '';

  if (value < 0) {
    sign = '-';
    value *= num(-1);
  }

  var _60 = num(60);

  var parts = [value % _60]; // seconds, including ms

  if (value < 60) {
    parts.unshift(0); // at least one : is required
  } else {
    value = (value - parts[0]) / _60;
    parts.unshift(value % _60); // minutes

    if (value >= 60) {
      value = (value - parts[0]) / _60;
      parts.unshift(value); // hours
    }
  }

  return sign + parts.map(function (n) {
    return n < 10 ? '0' + String(n) : String(n);
  }).join(':').replace(/000000\d*$/, '') // % 60 may introduce error
  ;
}

var intTime = {
  identify: function identify(value) {
    return typeof value === 'bigint' || Number.isInteger(value);
  },
  "default": true,
  tag: 'tag:yaml.org,2002:int',
  format: 'TIME',
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: function resolve(str, _onError, _ref) {
    var intAsBigInt = _ref.intAsBigInt;
    return parseSexagesimal(str, intAsBigInt);
  },
  stringify: stringifySexagesimal
};
exports.intTime = intTime;
var floatTime = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  "default": true,
  tag: 'tag:yaml.org,2002:float',
  format: 'TIME',
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: function resolve(str) {
    return parseSexagesimal(str, false);
  },
  stringify: stringifySexagesimal
};
exports.floatTime = floatTime;
var timestamp = {
  identify: function identify(value) {
    return value instanceof Date;
  },
  "default": true,
  tag: 'tag:yaml.org,2002:timestamp',
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp('^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})' + // YYYY-Mm-Dd
  '(?:' + // time is optional
  '(?:t|T|[ \\t]+)' + // t | T | whitespace
  '([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)' + // Hh:Mm:Ss(.ss)?
  '(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?' + // Z | +5 | -03:30
  ')?$'),
  resolve: function resolve(str) {
    var match = str.match(timestamp.test);
    if (!match) throw new Error('!!timestamp expects a date, starting with yyyy-mm-dd');

    var _match$map = match.map(Number),
        _match$map2 = _slicedToArray(_match$map, 7),
        year = _match$map2[1],
        month = _match$map2[2],
        day = _match$map2[3],
        hour = _match$map2[4],
        minute = _match$map2[5],
        second = _match$map2[6];

    var millisec = match[7] ? Number((match[7] + '00').substr(1, 3)) : 0;
    var date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
    var tz = match[8];

    if (tz && tz !== 'Z') {
      var d = parseSexagesimal(tz, false);
      if (Math.abs(d) < 30) d *= 60;
      date -= 60000 * d;
    }

    return new Date(date);
  },
  stringify: function stringify(_ref2) {
    var value = _ref2.value;
    return value.toISOString().replace(/((T00:00)?:00)?\.000Z$/, '');
  }
};
exports.timestamp = timestamp;

},{"../../stringify/stringifyNumber.js":71}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FOLD_QUOTED = exports.FOLD_FLOW = exports.FOLD_BLOCK = void 0;
exports.foldFlowLines = foldFlowLines;
var FOLD_FLOW = 'flow';
exports.FOLD_FLOW = FOLD_FLOW;
var FOLD_BLOCK = 'block';
exports.FOLD_BLOCK = FOLD_BLOCK;
var FOLD_QUOTED = 'quoted';
/**
 * Tries to keep input at up to `lineWidth` characters, splitting only on spaces
 * not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
 * terminated with `\n` and started with `indent`.
 */

exports.FOLD_QUOTED = FOLD_QUOTED;

function foldFlowLines(text, indent) {
  var mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'flow';

  var _ref = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
      indentAtStart = _ref.indentAtStart,
      _ref$lineWidth = _ref.lineWidth,
      lineWidth = _ref$lineWidth === void 0 ? 80 : _ref$lineWidth,
      _ref$minContentWidth = _ref.minContentWidth,
      minContentWidth = _ref$minContentWidth === void 0 ? 20 : _ref$minContentWidth,
      onFold = _ref.onFold,
      onOverflow = _ref.onOverflow;

  if (!lineWidth || lineWidth < 0) return text;
  var endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text.length <= endStep) return text;
  var folds = [];
  var escapedFolds = {};
  var end = lineWidth - indent.length;

  if (typeof indentAtStart === 'number') {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);else end = lineWidth - indentAtStart;
  }

  var split = undefined;
  var prev = undefined;
  var overflow = false;
  var i = -1;
  var escStart = -1;
  var escEnd = -1;

  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text, i);
    if (i !== -1) end = i + endStep;
  }

  for (var ch; ch = text[i += 1];) {
    if (mode === FOLD_QUOTED && ch === '\\') {
      escStart = i;

      switch (text[i + 1]) {
        case 'x':
          i += 3;
          break;

        case 'u':
          i += 5;
          break;

        case 'U':
          i += 9;
          break;

        default:
          i += 1;
      }

      escEnd = i;
    }

    if (ch === '\n') {
      if (mode === FOLD_BLOCK) i = consumeMoreIndentedLines(text, i);
      end = i + endStep;
      split = undefined;
    } else {
      if (ch === ' ' && prev && prev !== ' ' && prev !== '\n' && prev !== '\t') {
        // space surrounded by non-space can be replaced with newline + indent
        var next = text[i + 1];
        if (next && next !== ' ' && next !== '\n' && next !== '\t') split = i;
      }

      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = undefined;
        } else if (mode === FOLD_QUOTED) {
          // white-space collected at end may stretch past lineWidth
          while (prev === ' ' || prev === '\t') {
            prev = ch;
            ch = text[i += 1];
            overflow = true;
          } // Account for newline escape, but don't break preceding escape


          var j = i > escEnd + 1 ? i - 2 : escStart - 1; // Bail out if lineWidth & minContentWidth are shorter than an escape string

          if (escapedFolds[j]) return text;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = undefined;
        } else {
          overflow = true;
        }
      }
    }

    prev = ch;
  }

  if (overflow && onOverflow) onOverflow();
  if (folds.length === 0) return text;
  if (onFold) onFold();
  var res = text.slice(0, folds[0]);

  for (var _i = 0; _i < folds.length; ++_i) {
    var fold = folds[_i];

    var _end = folds[_i + 1] || text.length;

    if (fold === 0) res = "\n".concat(indent).concat(text.slice(0, _end));else {
      if (mode === FOLD_QUOTED && escapedFolds[fold]) res += "".concat(text[fold], "\\");
      res += "\n".concat(indent).concat(text.slice(fold + 1, _end));
    }
  }

  return res;
}
/**
 * Presumes `i + 1` is at the start of a line
 * @returns index of last newline in more-indented block
 */


function consumeMoreIndentedLines(text, i) {
  var ch = text[i + 1];

  while (ch === ' ' || ch === '\t') {
    do {
      ch = text[i += 1];
    } while (ch && ch !== '\n');

    ch = text[i + 1];
  }

  return i;
}

},{}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createStringifyContext = createStringifyContext;
exports.stringify = stringify;

var _anchors = require("../doc/anchors.js");

var _Node = require("../nodes/Node.js");

var _stringifyComment = require("./stringifyComment.js");

var _stringifyString = require("./stringifyString.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function createStringifyContext(doc, options) {
  var opt = Object.assign({
    blockQuote: true,
    commentString: _stringifyComment.stringifyComment,
    defaultKeyType: null,
    defaultStringType: 'PLAIN',
    directives: null,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: 'false',
    indentSeq: true,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: 'null',
    simpleKeys: false,
    singleQuote: null,
    trueStr: 'true',
    verifyAliasOrder: true
  }, doc.schema.toStringOptions, options);
  var inFlow;

  switch (opt.collectionStyle) {
    case 'block':
      inFlow = false;
      break;

    case 'flow':
      inFlow = true;
      break;

    default:
      inFlow = null;
  }

  return {
    anchors: new Set(),
    doc: doc,
    indent: '',
    indentStep: typeof opt.indent === 'number' ? ' '.repeat(opt.indent) : '  ',
    inFlow: inFlow,
    options: opt
  };
}

function getTagObject(tags, item) {
  if (item.tag) {
    var _match$find;

    var match = tags.filter(function (t) {
      return t.tag === item.tag;
    });
    if (match.length > 0) return (_match$find = match.find(function (t) {
      return t.format === item.format;
    })) !== null && _match$find !== void 0 ? _match$find : match[0];
  }

  var tagObj = undefined;
  var obj;

  if ((0, _Node.isScalar)(item)) {
    var _match$find2;

    obj = item.value;

    var _match = tags.filter(function (t) {
      var _t$identify;

      return (_t$identify = t.identify) === null || _t$identify === void 0 ? void 0 : _t$identify.call(t, obj);
    });

    tagObj = (_match$find2 = _match.find(function (t) {
      return t.format === item.format;
    })) !== null && _match$find2 !== void 0 ? _match$find2 : _match.find(function (t) {
      return !t.format;
    });
  } else {
    obj = item;
    tagObj = tags.find(function (t) {
      return t.nodeClass && obj instanceof t.nodeClass;
    });
  }

  if (!tagObj) {
    var _obj$constructor$name, _obj, _obj$constructor;

    var name = (_obj$constructor$name = (_obj = obj) === null || _obj === void 0 ? void 0 : (_obj$constructor = _obj.constructor) === null || _obj$constructor === void 0 ? void 0 : _obj$constructor.name) !== null && _obj$constructor$name !== void 0 ? _obj$constructor$name : _typeof(obj);
    throw new Error("Tag not resolved for ".concat(name, " value"));
  }

  return tagObj;
} // needs to be called before value stringifier to allow for circular anchor refs


function stringifyProps(node, tagObj, _ref) {
  var anchors = _ref.anchors,
      doc = _ref.doc;
  if (!doc.directives) return '';
  var props = [];
  var anchor = ((0, _Node.isScalar)(node) || (0, _Node.isCollection)(node)) && node.anchor;

  if (anchor && (0, _anchors.anchorIsValid)(anchor)) {
    anchors.add(anchor);
    props.push("&".concat(anchor));
  }

  var tag = node.tag ? node.tag : tagObj["default"] ? null : tagObj.tag;
  if (tag) props.push(doc.directives.tagString(tag));
  return props.join(' ');
}

function stringify(item, ctx, onComment, onChompKeep) {
  var _ctx$indentAtStart;

  if ((0, _Node.isPair)(item)) return item.toString(ctx, onComment, onChompKeep);

  if ((0, _Node.isAlias)(item)) {
    var _ctx$resolvedAliases;

    if (ctx.doc.directives) return item.toString(ctx);

    if ((_ctx$resolvedAliases = ctx.resolvedAliases) !== null && _ctx$resolvedAliases !== void 0 && _ctx$resolvedAliases.has(item)) {
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    } else {
      if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);else ctx.resolvedAliases = new Set([item]);
      item = item.resolve(ctx.doc);
    }
  }

  var tagObj = undefined;
  var node = (0, _Node.isNode)(item) ? item : ctx.doc.createNode(item, {
    onTagObj: function onTagObj(o) {
      return tagObj = o;
    }
  });
  if (!tagObj) tagObj = getTagObject(ctx.doc.schema.tags, node);
  var props = stringifyProps(node, tagObj, ctx);
  if (props.length > 0) ctx.indentAtStart = ((_ctx$indentAtStart = ctx.indentAtStart) !== null && _ctx$indentAtStart !== void 0 ? _ctx$indentAtStart : 0) + props.length + 1;
  var str = typeof tagObj.stringify === 'function' ? tagObj.stringify(node, ctx, onComment, onChompKeep) : (0, _Node.isScalar)(node) ? (0, _stringifyString.stringifyString)(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
  if (!props) return str;
  return (0, _Node.isScalar)(node) || str[0] === '{' || str[0] === '[' ? "".concat(props, " ").concat(str) : "".concat(props, "\n").concat(ctx.indent).concat(str);
}

},{"../doc/anchors.js":22,"../nodes/Node.js":31,"./stringifyComment.js":69,"./stringifyString.js":73}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringifyCollection = stringifyCollection;

var _Collection = require("../nodes/Collection.js");

var _Node = require("../nodes/Node.js");

var _stringify = require("./stringify.js");

var _stringifyComment = require("./stringifyComment.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function stringifyCollection(collection, ctx, options) {
  var _ctx$inFlow;

  var flow = (_ctx$inFlow = ctx.inFlow) !== null && _ctx$inFlow !== void 0 ? _ctx$inFlow : collection.flow;
  var stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
  return stringify(collection, ctx, options);
}

function stringifyBlockCollection(_ref, ctx, _ref2) {
  var comment = _ref.comment,
      items = _ref.items;
  var blockItemPrefix = _ref2.blockItemPrefix,
      flowChars = _ref2.flowChars,
      itemIndent = _ref2.itemIndent,
      onChompKeep = _ref2.onChompKeep,
      onComment = _ref2.onComment;
  var indent = ctx.indent,
      commentString = ctx.options.commentString;
  var itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    type: null
  });
  var chompKeep = false; // flag for the preceding node's status

  var lines = [];

  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    var _comment = null;

    if ((0, _Node.isNode)(item)) {
      if (!chompKeep && item.spaceBefore) lines.push('');
      addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
      if (item.comment) _comment = item.comment;
    } else if ((0, _Node.isPair)(item)) {
      var ik = (0, _Node.isNode)(item.key) ? item.key : null;

      if (ik) {
        if (!chompKeep && ik.spaceBefore) lines.push('');
        addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
      }
    }

    chompKeep = false;

    var _str = (0, _stringify.stringify)(item, itemCtx, function () {
      return _comment = null;
    }, function () {
      return chompKeep = true;
    });

    if (_comment) _str += (0, _stringifyComment.lineComment)(_str, itemIndent, commentString(_comment));
    if (chompKeep && _comment) chompKeep = false;
    lines.push(blockItemPrefix + _str);
  }

  var str;

  if (lines.length === 0) {
    str = flowChars.start + flowChars.end;
  } else {
    str = lines[0];

    for (var _i = 1; _i < lines.length; ++_i) {
      var line = lines[_i];
      str += line ? "\n".concat(indent).concat(line) : '\n';
    }
  }

  if (comment) {
    str += '\n' + (0, _stringifyComment.indentComment)(commentString(comment), indent);
    if (onComment) onComment();
  } else if (chompKeep && onChompKeep) onChompKeep();

  return str;
}

function stringifyFlowCollection(_ref3, ctx, _ref4) {
  var comment = _ref3.comment,
      items = _ref3.items;
  var flowChars = _ref4.flowChars,
      itemIndent = _ref4.itemIndent,
      onComment = _ref4.onComment;
  var indent = ctx.indent,
      indentStep = ctx.indentStep,
      commentString = ctx.options.commentString;
  itemIndent += indentStep;
  var itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    inFlow: true,
    type: null
  });
  var reqNewline = false;
  var linesAtValue = 0;
  var lines = [];

  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    var _comment2 = null;

    if ((0, _Node.isNode)(item)) {
      if (item.spaceBefore) lines.push('');
      addCommentBefore(ctx, lines, item.commentBefore, false);
      if (item.comment) _comment2 = item.comment;
    } else if ((0, _Node.isPair)(item)) {
      var ik = (0, _Node.isNode)(item.key) ? item.key : null;

      if (ik) {
        if (ik.spaceBefore) lines.push('');
        addCommentBefore(ctx, lines, ik.commentBefore, false);
        if (ik.comment) reqNewline = true;
      }

      var iv = (0, _Node.isNode)(item.value) ? item.value : null;

      if (iv) {
        if (iv.comment) _comment2 = iv.comment;
        if (iv.commentBefore) reqNewline = true;
      } else if (item.value == null && ik && ik.comment) {
        _comment2 = ik.comment;
      }
    }

    if (_comment2) reqNewline = true;

    var _str2 = (0, _stringify.stringify)(item, itemCtx, function () {
      return _comment2 = null;
    });

    if (i < items.length - 1) _str2 += ',';
    if (_comment2) _str2 += (0, _stringifyComment.lineComment)(_str2, itemIndent, commentString(_comment2));
    if (!reqNewline && (lines.length > linesAtValue || _str2.includes('\n'))) reqNewline = true;
    lines.push(_str2);
    linesAtValue = lines.length;
  }

  var str;
  var start = flowChars.start,
      end = flowChars.end;

  if (lines.length === 0) {
    str = start + end;
  } else {
    if (!reqNewline) {
      var len = lines.reduce(function (sum, line) {
        return sum + line.length + 2;
      }, 2);
      reqNewline = len > _Collection.Collection.maxFlowStringSingleLineLength;
    }

    if (reqNewline) {
      str = start;

      var _iterator = _createForOfIteratorHelper(lines),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var line = _step.value;
          str += line ? "\n".concat(indentStep).concat(indent).concat(line) : '\n';
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      str += "\n".concat(indent).concat(end);
    } else {
      str = "".concat(start, " ").concat(lines.join(' '), " ").concat(end);
    }
  }

  if (comment) {
    str += (0, _stringifyComment.lineComment)(str, commentString(comment), indent);
    if (onComment) onComment();
  }

  return str;
}

function addCommentBefore(_ref5, lines, comment, chompKeep) {
  var indent = _ref5.indent,
      commentString = _ref5.options.commentString;
  if (comment && chompKeep) comment = comment.replace(/^\n+/, '');

  if (comment) {
    var ic = (0, _stringifyComment.indentComment)(commentString(comment), indent);
    lines.push(ic.trimStart()); // Avoid double indent on first line
  }
}

},{"../nodes/Collection.js":30,"../nodes/Node.js":31,"./stringify.js":67,"./stringifyComment.js":69}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.indentComment = indentComment;
exports.stringifyComment = exports.lineComment = void 0;

/**
 * Stringifies a comment.
 *
 * Empty comment lines are left empty,
 * lines consisting of a single space are replaced by `#`,
 * and all other lines are prefixed with a `#`.
 */
var stringifyComment = function stringifyComment(str) {
  return str.replace(/^(?!$)(?: $)?/gm, '#');
};

exports.stringifyComment = stringifyComment;

function indentComment(comment, indent) {
  if (/^\n+$/.test(comment)) return comment.substring(1);
  return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}

var lineComment = function lineComment(str, indent, comment) {
  return str.endsWith('\n') ? indentComment(comment, indent) : comment.includes('\n') ? '\n' + indentComment(comment, indent) : (str.endsWith(' ') ? '' : ' ') + comment;
};

exports.lineComment = lineComment;

},{}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringifyDocument = stringifyDocument;

var _Node = require("../nodes/Node.js");

var _stringify = require("./stringify.js");

var _stringifyComment = require("./stringifyComment.js");

function stringifyDocument(doc, options) {
  var _doc$directives;

  var lines = [];
  var hasDirectives = options.directives === true;

  if (options.directives !== false && doc.directives) {
    var dir = doc.directives.toString(doc);

    if (dir) {
      lines.push(dir);
      hasDirectives = true;
    } else if (doc.directives.docStart) hasDirectives = true;
  }

  if (hasDirectives) lines.push('---');
  var ctx = (0, _stringify.createStringifyContext)(doc, options);
  var commentString = ctx.options.commentString;

  if (doc.commentBefore) {
    if (lines.length !== 1) lines.unshift('');
    var cs = commentString(doc.commentBefore);
    lines.unshift((0, _stringifyComment.indentComment)(cs, ''));
  }

  var chompKeep = false;
  var contentComment = null;

  if (doc.contents) {
    if ((0, _Node.isNode)(doc.contents)) {
      if (doc.contents.spaceBefore && hasDirectives) lines.push('');

      if (doc.contents.commentBefore) {
        var _cs = commentString(doc.contents.commentBefore);

        lines.push((0, _stringifyComment.indentComment)(_cs, ''));
      } // top-level block scalars need to be indented if followed by a comment


      ctx.forceBlockIndent = !!doc.comment;
      contentComment = doc.contents.comment;
    }

    var onChompKeep = contentComment ? undefined : function () {
      return chompKeep = true;
    };
    var body = (0, _stringify.stringify)(doc.contents, ctx, function () {
      return contentComment = null;
    }, onChompKeep);
    if (contentComment) body += (0, _stringifyComment.lineComment)(body, '', commentString(contentComment));

    if ((body[0] === '|' || body[0] === '>') && lines[lines.length - 1] === '---') {
      // Top-level block scalars with a preceding doc marker ought to use the
      // same line for their header.
      lines[lines.length - 1] = "--- ".concat(body);
    } else lines.push(body);
  } else {
    lines.push((0, _stringify.stringify)(doc.contents, ctx));
  }

  if ((_doc$directives = doc.directives) !== null && _doc$directives !== void 0 && _doc$directives.docEnd) {
    if (doc.comment) {
      var _cs2 = commentString(doc.comment);

      if (_cs2.includes('\n')) {
        lines.push('...');
        lines.push((0, _stringifyComment.indentComment)(_cs2, ''));
      } else {
        lines.push("... ".concat(_cs2));
      }
    } else {
      lines.push('...');
    }
  } else {
    var dc = doc.comment;
    if (dc && chompKeep) dc = dc.replace(/^\n+/, '');

    if (dc) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '') lines.push('');
      lines.push((0, _stringifyComment.indentComment)(commentString(dc), ''));
    }
  }

  return lines.join('\n') + '\n';
}

},{"../nodes/Node.js":31,"./stringify.js":67,"./stringifyComment.js":69}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringifyNumber = stringifyNumber;

function stringifyNumber(_ref) {
  var format = _ref.format,
      minFractionDigits = _ref.minFractionDigits,
      tag = _ref.tag,
      value = _ref.value;
  if (typeof value === 'bigint') return String(value);
  var num = typeof value === 'number' ? value : Number(value);
  if (!isFinite(num)) return isNaN(num) ? '.nan' : num < 0 ? '-.inf' : '.inf';
  var n = JSON.stringify(value);

  if (!format && minFractionDigits && (!tag || tag === 'tag:yaml.org,2002:float') && /^\d/.test(n)) {
    var i = n.indexOf('.');

    if (i < 0) {
      i = n.length;
      n += '.';
    }

    var d = minFractionDigits - (n.length - i - 1);

    while (d-- > 0) {
      n += '0';
    }
  }

  return n;
}

},{}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringifyPair = stringifyPair;

var _Node = require("../nodes/Node.js");

var _Scalar = require("../nodes/Scalar.js");

var _stringify = require("./stringify.js");

var _stringifyComment = require("./stringifyComment.js");

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function stringifyPair(_ref, ctx, onComment, onChompKeep) {
  var key = _ref.key,
      value = _ref.value;
  var _ctx = ctx,
      allNullValues = _ctx.allNullValues,
      doc = _ctx.doc,
      indent = _ctx.indent,
      indentStep = _ctx.indentStep,
      _ctx$options = _ctx.options,
      commentString = _ctx$options.commentString,
      indentSeq = _ctx$options.indentSeq,
      simpleKeys = _ctx$options.simpleKeys;
  var keyComment = (0, _Node.isNode)(key) && key.comment || null;

  if (simpleKeys) {
    if (keyComment) {
      throw new Error('With simple keys, key nodes cannot have comments');
    }

    if ((0, _Node.isCollection)(key)) {
      var msg = 'With simple keys, collection cannot be used as a key value';
      throw new Error(msg);
    }
  }

  var explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || (0, _Node.isCollection)(key) || ((0, _Node.isScalar)(key) ? key.type === _Scalar.Scalar.BLOCK_FOLDED || key.type === _Scalar.Scalar.BLOCK_LITERAL : _typeof(key) === 'object'));
  ctx = Object.assign({}, ctx, {
    allNullValues: false,
    implicitKey: !explicitKey && (simpleKeys || !allNullValues),
    indent: indent + indentStep
  });
  var keyCommentDone = false;
  var chompKeep = false;
  var str = (0, _stringify.stringify)(key, ctx, function () {
    return keyCommentDone = true;
  }, function () {
    return chompKeep = true;
  });

  if (!explicitKey && !ctx.inFlow && str.length > 1024) {
    if (simpleKeys) throw new Error('With simple keys, single line scalar must not span more than 1024 characters');
    explicitKey = true;
  }

  if (ctx.inFlow) {
    if (allNullValues || value == null) {
      if (keyCommentDone && onComment) onComment();
      return str === '' ? '?' : explicitKey ? "? ".concat(str) : str;
    }
  } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
    str = "? ".concat(str);

    if (keyComment && !keyCommentDone) {
      str += (0, _stringifyComment.lineComment)(str, ctx.indent, commentString(keyComment));
    } else if (chompKeep && onChompKeep) onChompKeep();

    return str;
  }

  if (keyCommentDone) keyComment = null;

  if (explicitKey) {
    if (keyComment) str += (0, _stringifyComment.lineComment)(str, ctx.indent, commentString(keyComment));
    str = "? ".concat(str, "\n").concat(indent, ":");
  } else {
    str = "".concat(str, ":");
    if (keyComment) str += (0, _stringifyComment.lineComment)(str, ctx.indent, commentString(keyComment));
  }

  var vcb = '';
  var valueComment = null;

  if ((0, _Node.isNode)(value)) {
    if (value.spaceBefore) vcb = '\n';

    if (value.commentBefore) {
      var cs = commentString(value.commentBefore);
      vcb += "\n".concat((0, _stringifyComment.indentComment)(cs, ctx.indent));
    }

    valueComment = value.comment;
  } else if (value && _typeof(value) === 'object') {
    value = doc.createNode(value);
  }

  ctx.implicitKey = false;
  if (!explicitKey && !keyComment && (0, _Node.isScalar)(value)) ctx.indentAtStart = str.length + 1;
  chompKeep = false;

  if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && (0, _Node.isSeq)(value) && !value.flow && !value.tag && !value.anchor) {
    // If indentSeq === false, consider '- ' as part of indentation where possible
    ctx.indent = ctx.indent.substr(2);
  }

  var valueCommentDone = false;
  var valueStr = (0, _stringify.stringify)(value, ctx, function () {
    return valueCommentDone = true;
  }, function () {
    return chompKeep = true;
  });
  var ws = ' ';

  if (vcb || keyComment) {
    if (valueStr === '' && !ctx.inFlow) ws = vcb === '\n' ? '\n\n' : vcb;else ws = "".concat(vcb, "\n").concat(ctx.indent);
  } else if (!explicitKey && (0, _Node.isCollection)(value)) {
    var flow = valueStr[0] === '[' || valueStr[0] === '{';
    if (!flow || valueStr.includes('\n')) ws = "\n".concat(ctx.indent);
  } else if (valueStr === '' || valueStr[0] === '\n') ws = '';

  str += ws + valueStr;

  if (ctx.inFlow) {
    if (valueCommentDone && onComment) onComment();
  } else if (valueComment && !valueCommentDone) {
    str += (0, _stringifyComment.lineComment)(str, ctx.indent, commentString(valueComment));
  } else if (chompKeep && onChompKeep) {
    onChompKeep();
  }

  return str;
}

},{"../nodes/Node.js":31,"../nodes/Scalar.js":33,"./stringify.js":67,"./stringifyComment.js":69}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringifyString = stringifyString;

var _Scalar = require("../nodes/Scalar.js");

var _foldFlowLines = require("./foldFlowLines.js");

var getFoldOptions = function getFoldOptions(ctx) {
  return {
    indentAtStart: ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  };
}; // Also checks for lines starting with %, as parsing the output as YAML 1.1 will
// presume that's starting a new document.


var containsDocumentMarker = function containsDocumentMarker(str) {
  return /^(%|---|\.\.\.)/m.test(str);
};

function lineLengthOverLimit(str, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0) return false;
  var limit = lineWidth - indentLength;
  var strLen = str.length;
  if (strLen <= limit) return false;

  for (var i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === '\n') {
      if (i - start > limit) return true;
      start = i + 1;
      if (strLen - start <= limit) return false;
    }
  }

  return true;
}

function doubleQuotedString(value, ctx) {
  var json = JSON.stringify(value);
  if (ctx.options.doubleQuotedAsJSON) return json;
  var implicitKey = ctx.implicitKey;
  var minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
  var indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  var str = '';
  var start = 0;

  for (var i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === ' ' && json[i + 1] === '\\' && json[i + 2] === 'n') {
      // space before newline needs to be escaped to not be folded
      str += json.slice(start, i) + '\\ ';
      i += 1;
      start = i;
      ch = '\\';
    }

    if (ch === '\\') switch (json[i + 1]) {
      case 'u':
        {
          str += json.slice(start, i);
          var code = json.substr(i + 2, 4);

          switch (code) {
            case '0000':
              str += '\\0';
              break;

            case '0007':
              str += '\\a';
              break;

            case '000b':
              str += '\\v';
              break;

            case '001b':
              str += '\\e';
              break;

            case '0085':
              str += '\\N';
              break;

            case '00a0':
              str += '\\_';
              break;

            case '2028':
              str += '\\L';
              break;

            case '2029':
              str += '\\P';
              break;

            default:
              if (code.substr(0, 2) === '00') str += '\\x' + code.substr(2);else str += json.substr(i, 6);
          }

          i += 5;
          start = i + 1;
        }
        break;

      case 'n':
        if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
          i += 1;
        } else {
          // folding will eat first newline
          str += json.slice(start, i) + '\n\n';

          while (json[i + 2] === '\\' && json[i + 3] === 'n' && json[i + 4] !== '"') {
            str += '\n';
            i += 2;
          }

          str += indent; // space after newline needs to be escaped to not be folded

          if (json[i + 2] === ' ') str += '\\';
          i += 1;
          start = i + 1;
        }

        break;

      default:
        i += 1;
    }
  }

  str = start ? str + json.slice(start) : json;
  return implicitKey ? str : (0, _foldFlowLines.foldFlowLines)(str, indent, _foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx));
}

function singleQuotedString(value, ctx) {
  if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes('\n') || /[ \t]\n|\n[ \t]/.test(value) // single quoted string can't have leading or trailing whitespace around newline
  ) return doubleQuotedString(value, ctx);
  var indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  var res = "'" + value.replace(/'/g, "''").replace(/\n+/g, "$&\n".concat(indent)) + "'";
  return ctx.implicitKey ? res : (0, _foldFlowLines.foldFlowLines)(res, indent, _foldFlowLines.FOLD_FLOW, getFoldOptions(ctx));
}

function quotedString(value, ctx) {
  var singleQuote = ctx.options.singleQuote;
  var qs;
  if (singleQuote === false) qs = doubleQuotedString;else {
    var hasDouble = value.includes('"');
    var hasSingle = value.includes("'");
    if (hasDouble && !hasSingle) qs = singleQuotedString;else if (hasSingle && !hasDouble) qs = doubleQuotedString;else qs = singleQuote ? singleQuotedString : doubleQuotedString;
  }
  return qs(value, ctx);
}

function blockString(_ref, ctx, onComment, onChompKeep) {
  var comment = _ref.comment,
      type = _ref.type,
      value = _ref.value;
  var _ctx$options = ctx.options,
      blockQuote = _ctx$options.blockQuote,
      commentString = _ctx$options.commentString,
      lineWidth = _ctx$options.lineWidth; // 1. Block can't end in whitespace unless the last line is non-empty.
  // 2. Strings consisting of only whitespace are best rendered explicitly.

  if (!blockQuote || /\n[\t ]+$/.test(value) || /^\s*$/.test(value)) {
    return quotedString(value, ctx);
  }

  var indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
  var literal = blockQuote === 'literal' ? true : blockQuote === 'folded' || type === _Scalar.Scalar.BLOCK_FOLDED ? false : type === _Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
  if (!value) return literal ? '|\n' : '>\n'; // determine chomping from whitespace at value end

  var chomp;
  var endStart;

  for (endStart = value.length; endStart > 0; --endStart) {
    var ch = value[endStart - 1];
    if (ch !== '\n' && ch !== '\t' && ch !== ' ') break;
  }

  var end = value.substring(endStart);
  var endNlPos = end.indexOf('\n');

  if (endNlPos === -1) {
    chomp = '-'; // strip
  } else if (value === end || endNlPos !== end.length - 1) {
    chomp = '+'; // keep

    if (onChompKeep) onChompKeep();
  } else {
    chomp = ''; // clip
  }

  if (end) {
    value = value.slice(0, -end.length);
    if (end[end.length - 1] === '\n') end = end.slice(0, -1);
    end = end.replace(/\n+(?!\n|$)/g, "$&".concat(indent));
  } // determine indent indicator from whitespace at value start


  var startWithSpace = false;
  var startEnd;
  var startNlPos = -1;

  for (startEnd = 0; startEnd < value.length; ++startEnd) {
    var _ch = value[startEnd];
    if (_ch === ' ') startWithSpace = true;else if (_ch === '\n') startNlPos = startEnd;else break;
  }

  var start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);

  if (start) {
    value = value.substring(start.length);
    start = start.replace(/\n+/g, "$&".concat(indent));
  }

  var indentSize = indent ? '2' : '1'; // root is at -1

  var header = (literal ? '|' : '>') + (startWithSpace ? indentSize : '') + chomp;

  if (comment) {
    header += ' ' + commentString(comment.replace(/ ?[\r\n]+/g, ' '));
    if (onComment) onComment();
  }

  if (literal) {
    value = value.replace(/\n+/g, "$&".concat(indent));
    return "".concat(header, "\n").concat(indent).concat(start).concat(value).concat(end);
  }

  value = value.replace(/\n+/g, '\n$&').replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2') // more-indented lines aren't folded
  //                ^ more-ind. ^ empty     ^ capture next empty lines only at end of indent
  .replace(/\n+/g, "$&".concat(indent));
  var body = (0, _foldFlowLines.foldFlowLines)("".concat(start).concat(value).concat(end), indent, _foldFlowLines.FOLD_BLOCK, getFoldOptions(ctx));
  return "".concat(header, "\n").concat(indent).concat(body);
}

function plainString(item, ctx, onComment, onChompKeep) {
  var type = item.type,
      value = item.value;
  var actualString = ctx.actualString,
      implicitKey = ctx.implicitKey,
      indent = ctx.indent,
      inFlow = ctx.inFlow;

  if (implicitKey && /[\n[\]{},]/.test(value) || inFlow && /[[\]{},]/.test(value)) {
    return quotedString(value, ctx);
  }

  if (!value || /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    // not allowed:
    // - empty string, '-' or '?'
    // - start with an indicator character (except [?:-]) or /[?-] /
    // - '\n ', ': ' or ' \n' anywhere
    // - '#' not preceded by a non-space char
    // - end with ' ' or ':'
    return implicitKey || inFlow || !value.includes('\n') ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }

  if (!implicitKey && !inFlow && type !== _Scalar.Scalar.PLAIN && value.includes('\n')) {
    // Where allowed & type not set explicitly, prefer block style for multiline strings
    return blockString(item, ctx, onComment, onChompKeep);
  }

  if (indent === '' && containsDocumentMarker(value)) {
    ctx.forceBlockIndent = true;
    return blockString(item, ctx, onComment, onChompKeep);
  }

  var str = value.replace(/\n+/g, "$&\n".concat(indent)); // Verify that output will be parsed as a string, as e.g. plain numbers and
  // booleans get parsed with those types in v1.2 (e.g. '42', 'true' & '0.9e-3'),
  // and others in v1.1.

  if (actualString) {
    var test = function test(tag) {
      var _tag$test;

      return tag["default"] && tag.tag !== 'tag:yaml.org,2002:str' && ((_tag$test = tag.test) === null || _tag$test === void 0 ? void 0 : _tag$test.test(str));
    };

    var _ctx$doc$schema = ctx.doc.schema,
        compat = _ctx$doc$schema.compat,
        tags = _ctx$doc$schema.tags;
    if (tags.some(test) || compat !== null && compat !== void 0 && compat.some(test)) return quotedString(value, ctx);
  }

  return implicitKey ? str : (0, _foldFlowLines.foldFlowLines)(str, indent, _foldFlowLines.FOLD_FLOW, getFoldOptions(ctx));
}

function stringifyString(item, ctx, onComment, onChompKeep) {
  var implicitKey = ctx.implicitKey,
      inFlow = ctx.inFlow;
  var ss = typeof item.value === 'string' ? item : Object.assign({}, item, {
    value: String(item.value)
  });
  var type = item.type;

  if (type !== _Scalar.Scalar.QUOTE_DOUBLE) {
    // force double quotes on control characters & unpaired surrogates
    if (/(?:[\0-\x08\x0B-\x1F\x7F-\x9F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/.test(ss.value)) type = _Scalar.Scalar.QUOTE_DOUBLE;
  }

  var _stringify = function _stringify(_type) {
    switch (_type) {
      case _Scalar.Scalar.BLOCK_FOLDED:
      case _Scalar.Scalar.BLOCK_LITERAL:
        return implicitKey || inFlow ? quotedString(ss.value, ctx) // blocks are not valid inside flow containers
        : blockString(ss, ctx, onComment, onChompKeep);

      case _Scalar.Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(ss.value, ctx);

      case _Scalar.Scalar.QUOTE_SINGLE:
        return singleQuotedString(ss.value, ctx);

      case _Scalar.Scalar.PLAIN:
        return plainString(ss, ctx, onComment, onChompKeep);

      default:
        return null;
    }
  };

  var res = _stringify(type);

  if (res === null) {
    var _ctx$options2 = ctx.options,
        defaultKeyType = _ctx$options2.defaultKeyType,
        defaultStringType = _ctx$options2.defaultStringType;
    var t = implicitKey && defaultKeyType || defaultStringType;
    res = _stringify(t);
    if (res === null) throw new Error("Unsupported default string type ".concat(t));
  }

  return res;
}

},{"../nodes/Scalar.js":33,"./foldFlowLines.js":66}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.visit = visit;
exports.visitAsync = visitAsync;

var _Node = require("./nodes/Node.js");

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var BREAK = Symbol('break visit');
var SKIP = Symbol('skip children');
var REMOVE = Symbol('remove node');
/**
 * Apply a visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */

function visit(node, visitor) {
  var visitor_ = initVisitor(visitor);

  if ((0, _Node.isDocument)(node)) {
    var cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
    if (cd === REMOVE) node.contents = null;
  } else visit_(null, node, visitor_, Object.freeze([]));
} // Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.

/** Terminate visit traversal completely */


visit.BREAK = BREAK;
/** Do not visit the children of the current node */

visit.SKIP = SKIP;
/** Remove the current node */

visit.REMOVE = REMOVE;

function visit_(key, node, visitor, path) {
  var ctrl = callVisitor(key, node, visitor, path);

  if ((0, _Node.isNode)(ctrl) || (0, _Node.isPair)(ctrl)) {
    replaceNode(key, path, ctrl);
    return visit_(key, ctrl, visitor, path);
  }

  if (_typeof(ctrl) !== 'symbol') {
    if ((0, _Node.isCollection)(node)) {
      path = Object.freeze(path.concat(node));

      for (var i = 0; i < node.items.length; ++i) {
        var ci = visit_(i, node.items[i], visitor, path);
        if (typeof ci === 'number') i = ci - 1;else if (ci === BREAK) return BREAK;else if (ci === REMOVE) {
          node.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if ((0, _Node.isPair)(node)) {
      path = Object.freeze(path.concat(node));
      var ck = visit_('key', node.key, visitor, path);
      if (ck === BREAK) return BREAK;else if (ck === REMOVE) node.key = null;
      var cv = visit_('value', node.value, visitor, path);
      if (cv === BREAK) return BREAK;else if (cv === REMOVE) node.value = null;
    }
  }

  return ctrl;
}
/**
 * Apply an async visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `Promise`: Must resolve to one of the following values
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */


function visitAsync(_x, _x2) {
  return _visitAsync.apply(this, arguments);
} // Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.

/** Terminate visit traversal completely */


function _visitAsync() {
  _visitAsync = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(node, visitor) {
    var visitor_, cd;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            visitor_ = initVisitor(visitor);

            if (!(0, _Node.isDocument)(node)) {
              _context.next = 8;
              break;
            }

            _context.next = 4;
            return visitAsync_(null, node.contents, visitor_, Object.freeze([node]));

          case 4:
            cd = _context.sent;
            if (cd === REMOVE) node.contents = null;
            _context.next = 10;
            break;

          case 8:
            _context.next = 10;
            return visitAsync_(null, node, visitor_, Object.freeze([]));

          case 10:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _visitAsync.apply(this, arguments);
}

visitAsync.BREAK = BREAK;
/** Do not visit the children of the current node */

visitAsync.SKIP = SKIP;
/** Remove the current node */

visitAsync.REMOVE = REMOVE;

function visitAsync_(_x3, _x4, _x5, _x6) {
  return _visitAsync_.apply(this, arguments);
}

function _visitAsync_() {
  _visitAsync_ = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(key, node, visitor, path) {
    var ctrl, i, ci, ck, cv;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return callVisitor(key, node, visitor, path);

          case 2:
            ctrl = _context2.sent;

            if (!((0, _Node.isNode)(ctrl) || (0, _Node.isPair)(ctrl))) {
              _context2.next = 6;
              break;
            }

            replaceNode(key, path, ctrl);
            return _context2.abrupt("return", visitAsync_(key, ctrl, visitor, path));

          case 6:
            if (!(_typeof(ctrl) !== 'symbol')) {
              _context2.next = 46;
              break;
            }

            if (!(0, _Node.isCollection)(node)) {
              _context2.next = 28;
              break;
            }

            path = Object.freeze(path.concat(node));
            i = 0;

          case 10:
            if (!(i < node.items.length)) {
              _context2.next = 26;
              break;
            }

            _context2.next = 13;
            return visitAsync_(i, node.items[i], visitor, path);

          case 13:
            ci = _context2.sent;

            if (!(typeof ci === 'number')) {
              _context2.next = 18;
              break;
            }

            i = ci - 1;
            _context2.next = 23;
            break;

          case 18:
            if (!(ci === BREAK)) {
              _context2.next = 22;
              break;
            }

            return _context2.abrupt("return", BREAK);

          case 22:
            if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }

          case 23:
            ++i;
            _context2.next = 10;
            break;

          case 26:
            _context2.next = 46;
            break;

          case 28:
            if (!(0, _Node.isPair)(node)) {
              _context2.next = 46;
              break;
            }

            path = Object.freeze(path.concat(node));
            _context2.next = 32;
            return visitAsync_('key', node.key, visitor, path);

          case 32:
            ck = _context2.sent;

            if (!(ck === BREAK)) {
              _context2.next = 37;
              break;
            }

            return _context2.abrupt("return", BREAK);

          case 37:
            if (ck === REMOVE) node.key = null;

          case 38:
            _context2.next = 40;
            return visitAsync_('value', node.value, visitor, path);

          case 40:
            cv = _context2.sent;

            if (!(cv === BREAK)) {
              _context2.next = 45;
              break;
            }

            return _context2.abrupt("return", BREAK);

          case 45:
            if (cv === REMOVE) node.value = null;

          case 46:
            return _context2.abrupt("return", ctrl);

          case 47:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _visitAsync_.apply(this, arguments);
}

function initVisitor(visitor) {
  if (_typeof(visitor) === 'object' && (visitor.Collection || visitor.Node || visitor.Value)) {
    return Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor);
  }

  return visitor;
}

function callVisitor(key, node, visitor, path) {
  var _visitor$Map, _visitor$Seq, _visitor$Pair, _visitor$Scalar, _visitor$Alias;

  if (typeof visitor === 'function') return visitor(key, node, path);
  if ((0, _Node.isMap)(node)) return (_visitor$Map = visitor.Map) === null || _visitor$Map === void 0 ? void 0 : _visitor$Map.call(visitor, key, node, path);
  if ((0, _Node.isSeq)(node)) return (_visitor$Seq = visitor.Seq) === null || _visitor$Seq === void 0 ? void 0 : _visitor$Seq.call(visitor, key, node, path);
  if ((0, _Node.isPair)(node)) return (_visitor$Pair = visitor.Pair) === null || _visitor$Pair === void 0 ? void 0 : _visitor$Pair.call(visitor, key, node, path);
  if ((0, _Node.isScalar)(node)) return (_visitor$Scalar = visitor.Scalar) === null || _visitor$Scalar === void 0 ? void 0 : _visitor$Scalar.call(visitor, key, node, path);
  if ((0, _Node.isAlias)(node)) return (_visitor$Alias = visitor.Alias) === null || _visitor$Alias === void 0 ? void 0 : _visitor$Alias.call(visitor, key, node, path);
  return undefined;
}

function replaceNode(key, path, node) {
  var parent = path[path.length - 1];

  if ((0, _Node.isCollection)(parent)) {
    parent.items[key] = node;
  } else if ((0, _Node.isPair)(parent)) {
    if (key === 'key') parent.key = node;else parent.value = node;
  } else if ((0, _Node.isDocument)(parent)) {
    parent.contents = node;
  } else {
    var pt = (0, _Node.isAlias)(parent) ? 'alias' : 'scalar';
    throw new Error("Cannot replace node with ".concat(pt, " parent"));
  }
}

},{"./nodes/Node.js":31}],75:[function(require,module,exports){
"use strict";

var YAML = require('yaml');

module.exports = {
  myYAML: YAML
};
/*var x = YAML.parseDocument("YAML:\n  # this is a test\n  - A human-readable data serialization language\n  - https://en.wikipedia.org/wiki/YAML\nyaml:\n  - A complete JavaScript implementation\n  - https://www.npmjs.com/package/yaml # balls\nyaml: potato")
console.log(x)
console.log('===')
if (x.errors) {
  console.log('errors detected');
  console.log(x.errors);
  error_line = x.errors[0].linePos[0].line;
  error_msg = x.errors[0].message.split(':\n')[0]

  console.log(error_line);
  console.log(error_msg);
  x.errors.forEach((e, i) => {
    console.log(e.linePos[0]);
    console.log(e.linePos[1]);
  });
}
console.log(x.errors)
console.log(x.errors[0].linePos[0])
console.log('====')
console.log(YAML.stringify(x))
console.log(x.toString())
*/

},{"yaml":"yaml"}],"yaml":[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {};
exports["default"] = void 0;

var YAML = _interopRequireWildcard(require("./dist/index.js"));

Object.keys(YAML).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === YAML[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return YAML[key];
    }
  });
});

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// `export * as default from ...` fails on Webpack v4
// https://github.com/eemeli/yaml/issues/228
var _default = YAML;
exports["default"] = _default;

},{"./dist/index.js":27}]},{},[75]);
