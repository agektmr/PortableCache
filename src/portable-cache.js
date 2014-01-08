var config = {
  'version':            '',
  'responsive-image':   'no',
  'root-path':          '',
  'preferred-storage':  'auto',
  'debug-mode':         'no'
};

var viewport = {
  'width':          'device-width',
  'height':         'device-height',
  'initial-scale':  1,
  'minimum-scale':  1,
  'maximum-scale':  1,
  'user-scalable':  'yes'
};

var storage = null;

var SPACER_GIF    = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
    STORAGE_NAME  = 'PortableCache',
    NOT_SUPPORTED = 'NOT_SUPPORTED';

var requestFileSystem = window.requestFileSystem ||
                        window.webkitRequestFileSystem ||
                        window.mozRequestFileSystem ||
                        window.msRequestFileSystem ||
                        undefined;

var indexedDB         = window.indexedDB ||
                        window.webkitIndexedDB ||
                        window.mozIndexedDB ||
                        window.msIndexedDB ||
                        undefined;

var openDatabase      = window.openDatabase ||
                        undefined;

var localStorage      = window.localStorage ||
                        undefined;

var Blob              = window.Blob ||
                        window.WebKitBlob ||
                        window.MozBlob ||
                        window.MsBlob ||
                        undefined;

var BlobBuilder       = window.BlobBuilder ||
                        window.WebKitBlobBuilder ||
                        window.MozBlobBuilder ||
                        window.MsBlobBuilder ||
                        undefined;

var URL               = window.URL ||
                        window.webkitURL ||
                        window.mozURL ||
                        window.msURL ||
                        window.oURL ||
                        undefined;

var base64encode = function(s) {
  var base64list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var t = '', p = -6, a = 0, i = 0, v = 0, c;

  while ((i < s.length) || (p > -6)) {
    if (p < 0) {
      if (i < s.length) {
        c = s[i++];
        v += 8;
      } else {
        c = 0;
      }
      a = ((a&255)<<8)|(c&255);
      p += 8;
    }
    t += base64list.charAt((v > 0) ? (a>>p)&63 : 64);
    p -= 6;
    v -= 6;
  }
  return t;
};

/**
 * Returns true if given string indicates binary type
 * @param  String  type   HTML tag name
 * @return Boolean        true if binary, false if not
 */
var isBinary = function(tag) {
  return (/^(img|audio|video)/).test(tag);
};

/**
 * Create Blob object with Android browser bug in mind.
 * @param  {[type]} content [description]
 * @param  {[type]} type    [description]
 * @return {[type]}         [description]
 */
var createBlob = function(content, type) {
  var blob = null;
  if (content instanceof Blob) {
    return content;
  }
  // If content is ArrayBuffer and Blob are supported
  if (Blob) {
    try {
      // Android browser fails here
      blob = new Blob([content], {type: type});
    } catch(e) {
      var bb = new BlobBuilder();
      bb.append(content);
      blob = bb.getBlob(type);
    }
  // Are there still browsers with BlobBuilder support?
  } else if (BlobBuilder) {
    var bb = new BlobBuilder();
    bb.append(content);
    blob = bb.getBlob(type);
  }
  return blob;
};

/**
 * Parse content of meta element separated by comma
 * @param  String content   Content string to parse
 * @param  {Object} obj     Object to override
 * @return {Object}         Object overridden by parsed content
 */
var parseMetaContent = function(content, obj) {
  obj = obj || {};
  var separate = content.split(/,\s*/g);
  for (var j = 0; j < separate.length; j++) {
    var matches = separate[j].split('=');
    if (matches.length === 2) {
      obj[matches[0]] = matches[1];
    }
  }
  return obj;
};

var canonicalizePath = function(path) {
  if (path.indexOf('http') === 0 || path.indexOf('//') === 0) return path;

  var trim = function(s) {
    return s==''?false:true;
  }
  var prefix_ = location.pathname.split('/').filter(trim);
  var path_ = path.split('/');
  do {
    switch (path_[0]) {
      case '..':
        prefix_ = prefix_.slice(0, -1);
        path_ = path_.slice(1);
        break;
      case '.':
      case '':
        path_ = path_.slice(1);
        break;
    }
  } while (path_[0] == '..');
  path_ = prefix_.concat(path_);
  return '/'+path_.join('/');
};

var addEventListenerFn = (window.document.addEventListener ?
    function(element, type, fn) { element.addEventListener(type, fn); } :
    function(element, type, fn) { element.attachEvent('on'+type, fn); });

var removeEventListenerFn = (window.document.removeEventListener ?
    function(element, type, fn) { element.removeEventListener(type, fn); } :
    function(element, type, fn) { element.detachEvent('on'+type, fn); });

// Refer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function() {},
        fBound = function() {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}

// Refer: https://developer.mozilla.org/ja/docs/DOM/document.cookie
var Cookies = {
  getItem: function (sKey) {
    if (!sKey || !this.hasItem(sKey)) { return null; }
    return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Tue, 19 Jan 2038 03:14:07 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toGMTString();
          break;
      }
    }
    document.cookie = escape(sKey) + "=" + escape(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
  },
  removeItem: function (sKey, sPath) {
    if (!sKey || !this.hasItem(sKey)) { return; }
    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = unescape(aKeys[nIdx]); }
    return aKeys;
  }
};

/**
 * Cache Entry
 * @param {Object|HTMLElement} data   data object that 
 */
var CacheEntry = function(entry) {
  this.src        = '';
  this.content    = '';
  this.mimetype   = '';
  this.lazyload   = false;

  // Check if this is an HTMLElement instance
  if (entry.nodeName) {
    // If entry is an HTMLElement, all properties will be derived from the element.
    this.tag      = entry.nodeName.toLowerCase();
    this.elem     = entry;
    this.url      = canonicalizePath(entry.getAttribute('data-cache-url'));
    this.version  = entry.getAttribute('data-cache-version') || config['version'];
    this.type     = isBinary(this.tag) ? 'binary' : 'text';
  } else {
    this.tag      = entry.tag || '';
    this.elem     = null;
    this.url      = canonicalizePath(entry.url);
    this.version  = entry.version || config['version'];
    this.type     = entry.type || 'text'; // (binary|json|text)
  }

  if (this.version === '') {
    throw 'Cache version cannot be empty string.';
  }

  // Check if we really should skip legacy browsers
  if (this.tag == 'img' && config['version'] != NOT_SUPPORTED) {
    this.elem.src = SPACER_GIF;
    // TODO: What if lazyload supported natively?
    // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/ResourcePriorities/Overview.html#attr-lazyload
    this.lazyload = entry.getAttribute('lazyload') !== null ? true : false;
    // TODO: Determine size of image responsively
  }
};
CacheEntry.prototype = {
  load: function(callback) {
    var errorCallback = function(errorMessage) {
      __debug && console.log('[%s] %s falling back.', this.url, errorMessage);
      callback();
    };

    // If non-supported browser, or only lazyload is requested, fallback
    if (config['version'] == NOT_SUPPORTED || this.url === '') {
      __debug && console.log('[%s] fallback without checking cache.', this.url);
      callback();
    // If previous version doesn't exist, fetch and construct;
    } else if (config['prev-version'] === null) {
      __debug && console.log('[%s] no version found. fetching.', this.url);
      this.fetch((function fetchResponse(data) {
        this.content  = data.content;
        this.mimetype = data.mimetype;
        this.createCache(false, callback, errorCallback.bind(this));
      }).bind(this), errorCallback.bind(this));
    } else {
      // Read cache
      this.readCache((function onReadCache(data) {
        if (!data) {
          __debug && console.log('[%s] cache not found. fetching...', this.url);
          this.fetch((function fetchResponse(data) {
            this.content  = data.content;
            this.mimetype = data.mimetype;
            this.createCache(false, callback, errorCallback.bind(this));
          }).bind(this), errorCallback.bind(this));
        } else if (data.version !== this.version) {
          __debug && console.log('[%s] deprecated cache found. fetching...', this.url);
          this.fetch((function fetchResponse(data) {
            this.content  = data.content;
            this.mimetype = data.mimetype;
            this.createCache(true, callback, errorCallback.bind(this));
          }).bind(this), errorCallback.bind(this));
        } else {
          // If cache exists and is still valid
          this.src      = data.src || '';
          this.content  = data.content || '';
          this.mimetype = data.mimetype;
          __debug && console.log('[%s] cache found. loading.', this.url);
          callback();
        }
      }).bind(this), (function onReadCacheError(message) {
        __debug && console.log('[%s] reading cache failed. %s falling back.', this.url, message);
        callback();
      }).bind(this));
    }
  },
  readCache: function(callback, errorCallback) {
    if (storage) {
      storage.get(this, callback, errorCallback);
    } else if (typeof errorCallback == 'function') {
      errorCallback('storage not ready');
    }
  },
  createCache: function(cacheExists, callback, errorCallback) {
    // If cache already exists and storage is WebSQL, "update" instead of "set"
    var method = (cacheExists && storage instanceof sql) ? 'update' : 'set';

    // It's possible storage failed on initialization and fallbacking.
    if (!storage) {
      if (typeof errorCallback == 'function')
        errorCallback('storage not ready');
      return;
    }

    // At this point, this.content is either a text or a blob.
    // If received content is Blob and storage is not FileSystem, convert it to DataURL
    if (storage instanceof fs) {
      // TODO: store as Blob if Firefox
      __debug && console.log('[%s] creating Blob cache in FileSystem.', this.url);
      storage.set(this, callback, errorCallback);
    } else {
      this.getContentAs('text', (function onGetContent(content) {
        this.content = content;
        __debug && console.log('[%s] creating DataURL cache.', this.url);
        storage[method](this, callback, errorCallback);
      }).bind(this));
    }
  },
  removeCache: function(callback, errorCallback) {
    if (storage) {
      storage.remove(this);
    } else if (typeof errorCallback == 'function') {
      errorCallback('storage not ready.');
    }
  },
  fetch: function(callback, errorCallback) {
    var xhr = new XMLHttpRequest();
    var supportsType = (typeof xhr.responseType == 'string');
    xhr.open('GET', this.url, true);
    if (this.type == 'binary') {
      if (supportsType) {
        xhr.responseType = 'blob';
        // If setting 'blob' is rejected, use 'arraybuffer' instead (for Android Browser)
        xhr.responseType = xhr.responseType !== 'blob' ? 'arraybuffer' : 'blob';
      } else if (xhr.overrideMimeType) {
        // Hack if binary is not supported (but non IE)
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
      } else {
        errorCallback('binary not supported on this browser.');
      }
    } else if (this.type == 'json') {
      xhr.responseType = 'json';
      // If setting 'json' is rejected, use 'text' instead
      xhr.responseType = xhr.responseType != 'json' ? 'text' : 'json';
    }
    xhr.onreadystatechange = (function onReadyStateChange() {
      if (xhr.readyState === 4) {
        var data = {};
        if (xhr.status === 200 || xhr.status === 304) {
          data.mimetype = xhr.getResponseHeader('Content-Type').replace(/^(.*?);.*$/g, '$1');
          if (this.type == 'binary') {
            if (supportsType) {
              if (xhr.responseType == 'blob') {
                // Modern browsers
                data.content = xhr.response;
                __debug && console.log('[%s] fetched binary as Blob.', this.url);
              } else if (xhr.responseType == 'arraybuffer') {
                // For Android Browser 3.x~
                data.content = createBlob(xhr.response, data.mimetype);
                __debug && console.log('[%s] fetched binary as ArrayBuffer.', this.url);
              }
            } else if (typeof VBArray != 'undefined') {
              // For IE 9
              data.content = new VBArray(xhr.responseBody).toArray();
              __debug && console.log('[%s] fetched binary using VBArray.', this.url);
            } else {
              // Android Browser 2.x
              var array = [];
              var text = xhr.responseText;
              for (var i = 0; i < text.length; i++) {
                var c = text.charCodeAt(i);
                array.push(c & 0xff);
              }
              data.content = 'data:'+data.mimetype+';base64,'+base64encode(array);
              __debug && console.log('[%s] fetched binary using text manipulation.', this.url);
            }
          } else if (this.type == 'json') {
            if (supportsType) {
              data.content = xhr.response;
            } else {
              try {
                data.content = JSON.parse(xhr.responseText);
              } catch (e) {
                errorCallback('Unparsable JSON response');
              }
            }
          } else {
            data.content = xhr.responseText;
            __debug && console.log('[%s] fetched text content.', this.url);
          }
          callback(data);
        } else if (xhr.status === 0) {
          // replace status code with cross domain if it is
          if (this.url.indexOf(window.location.origin) === -1) {
            errorCallback('XMLHttpRequest was allowed because of Access-Control-Allow-Origin.');
          } else {
            errorCallback('XMLHttpRequest unknown error.');
          }
        } else {
          errorCallback('XMLHttpRequest error: '+xhr.status);
        }
      }
    }).bind(this);
    xhr.send();
  },
  constructDOM: function(callback) {
    callback = typeof callback !== 'function' ? function(){} : callback;

    // At this point, no `src` means either DataURL or text content
    if (!this.src && typeof this.content == 'string' && this.content.indexOf('data:') === 0) {
      this.src = this.content;
    }

    switch (this.tag) {
      case 'audio':
      case 'video':
      case 'img':
        if (this.src) {
          this.elem.setAttribute('src', this.src);
          __debug && console.log('[%s] replaced src of <%s>', this.url, this.tag);
          callback();
        } else {
          this.elem.setAttribute('src', this.url);
          __debug && console.log('[%s] fallback to <%s>', this.url, this.tag);
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      case 'script':
        if (this.src) {
          this.elem.setAttribute('src', this.src);
          __debug && console.log('[%s] replaced src of <script>', this.url);
          callback();
        } else if (this.content) {
          this.elem.textContent = this.content;
          __debug && console.log('[%s] inlined to <script>', this.url);
          callback();
          return;
        } else {
          this.elem.setAttribute('src', this.url);
          __debug && console.log('[%s] fallback to <script>', this.url);
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      case 'link':
        if (this.src) {
          this.elem.setAttribute('href', this.src);
          __debug && console.log('[%s] replaced href of <link>', this.url);
          callback();
        } else if (this.content) {
          this.tag = 'style';
          this.elem = document.createElement('style');
          this.elem.textContent = this.content;
          document.head.appendChild(this.elem);
          __debug && console.log('[%s] inserted <style>', this.url);
          callback();
        } else {
          this.elem.setAttribute('href', this.url);
          __debug && console.log('[%s] fallback to <link>', this.url);
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      default:
        break;
    }
  },
  getContentAs: function(type, callback, errorCallback) {
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;
    var reader = Blob ? new FileReader() : null;

    if (this.content == '') {
      __debug && console.error('[%s] content not loaded.', this.url);
      errorCallback('content not loaded.');
    }

    // type accepts (arraybuffer|blob|text)
    switch (type) {
      case 'text':
        if (reader && this.content instanceof Blob) {
          // Convert content to DataURL
          __debug && console.log('[%s] converting Blob to DataURL using FileReader.', this.url);
          reader.onload = (function onReaderLoad(event) {
            callback(event.target.result);
          }).bind(this);
          reader.readAsDataURL(this.content);
        } else if (this.content instanceof Array) {
          // For IE 9, convert VBArray generated array into DataURL
          __debug && console.log('[%s] converting Blob to DataURL with manipulation.', this.url);
          callback('data:'+this.mimetype+';base64,'+base64encode(this.content));
        } else if (typeof this.content == 'string') {
          callback(this.content);
        }
        break;
      case 'arraybuffer':
        if (reader && this.content instanceof Blob) {
          // Convert content to DataURL
          __debug && console.log('[%s] converting Blob to ArrayBuffer using FileReader.', this.url);
          reader.onload = (function onReaderLoad(event) {
            callback(event.target.result);
          }).bind(this);
          reader.readAsArrayBuffer(this.content);
        } else if (atob && typeof this.content == 'string' && this.content.indexOf('data:') === 0) {
          // Generate TypedArray from DataURL
          var ab = new Uint8Array(atob(this.content.split(',')[1]).split('').map(function(c) {
            return c.charCodeAt(0);
          }));
          callback(ab.buffer);
        } else {
          __debug && console.error('[%s] ArrayBuffer not supported on this browser.', this.url);
          errorCallback('ArrayBuffer not supported on this browser.');
        }
        break;
      case 'blob':
        if (this.content instanceof Blob) {
          callback(this.content);
        } else if (reader && ArrayBuffer && atob &&
          typeof this.content == 'string' && this.content.indexOf('data:') === 0) {
          // Generate TypedArray from DataURL
          var ab = new Uint8Array(atob(this.content.split(',')[1]).split('').map(function(c) {
            return c.charCodeAt(0);
          }));
          // Generate Blob
          callback(createBlob(ab.buffer, this.mimetype));
        } else {
          __debug && console.error('[%s] Blob not supported on this browser.', this.url);
          errorCallback('Blob not supported on this browser.');
        }
        break;
    }
  }
};

var CacheManager = function() {
  this.entries = [];
  this.lazyload = [];

  // Load configuration and viewport
  var _config = null,
      _viewport = null;
  if (document.querySelector) {
    _config = document.querySelector('meta[name="portable-cache"]');
    _viewport = document.querySelector('meta[name="viewport"]');
  } else {
    var metas = document.getElementsByTagName('meta');
    for (var i = 0; i < metas.length; i++) {
      var name = metas[i].getAttribute('name');
      if (name == 'portable-cache') {
        _config = metas[i];
        continue;
      }
      if (name == 'viewport') {
        _viewport = metas[i];
      }
    }
  }
  if (_config) {
    // Load configuration
    parseMetaContent(_config.getAttribute('content'), config);
  }
  if (_viewport) {
    // Load viewport
    parseMetaContent(_viewport.getAttribute('content'), viewport);
  }

  // Previous version number
  config['prev-version'] = Cookies.getItem('pcache_version');

  // Debug mode
  __debug = typeof __debug === 'undefined' &&
            config['debug-mode'] !== 'no' &&
            window.console ? true : false;

  __debug && console.log('Configuration loaded:', config);

  // Failing if any of these won't work
  if (config['prev-version'] == NOT_SUPPORTED ||
      document.querySelectorAll === undefined ||
      document.textContent === undefined ||
      document.head === undefined) {
    __debug && console.log('This browser is not supported.');
    config['version'] = NOT_SUPPORTED;
    addEventListenerFn(document, 'load', this.bootstrap.bind(this));

  } else {
    var errorCallback = function(errorMessage) {
      __debug && console.log('%s Falling back.', errorMessage);
      storage = null;
      if (document.readyState == 'complete' ||
          document.readyState == 'interactive' ||
          document.readyState == 'loaded') {
        this.bootstrap();
      } else {
        addEventListenerFn(document, 'load', this.bootstrap.bind(this));
      }
    };

    // Initialize best available storage
    var ps = config['preferred-storage'];
    storage = (ps=='filesystem'   || (requestFileSystem && ps=='auto')) ?
              new fs(this.bootstrap.bind(this), errorCallback.bind(this)) :
              (ps=='idb'          || (indexedDB         && ps=='auto')) ?
              new idb(this.bootstrap.bind(this), errorCallback.bind(this)) :
              (ps=='sql'          || (openDatabase      && ps=='auto')) ?
              new sql(this.bootstrap.bind(this), errorCallback.bind(this)) :
              (ps=='localstorage' || (localStorage      && ps=='auto')) ?
              new ls(this.bootstrap.bind(this), errorCallback.bind(this)) :
              undefined;

    if (!storage) {
      // No available storages found
      __debug && console.log('None of storages are available. Falling back.');
      addEventListenerFn(document, 'load', this.bootstrap.bind(this));
    }
  }
};

CacheManager.prototype = {
  bootstrap: function() {
    var onLazyload = (function() {
      if (this.lazyload.length) {
        this.loadLazyImages();
      } else {
        removeEventListenerFn(document, 'scroll', onLazyload);
        __debug && console.log('lazyload done. removed `scroll` event');
      }
    }).bind(this);

    // Prevent flashing
    document.body.style.display = 'none';
    this.queryElements(['link', 'script'], (function onStyleLoaded() {
      document.body.style.display = 'block';
      var ready;
      if (document.createEvent) {
        ready = document.createEvent('HTMLEvents');
        ready.initEvent('pcache-ready', true, false);
      } else {
        ready = new Event('pcache-ready', {bubbles: true, cancelable: false});
      }
      document.dispatchEvent(ready);
      this.queryElements(['img', 'audio', 'video'], (function onMediaLoaded() {
        // Set lazyload images
        if (this.lazyload.length > 0) {
          addEventListenerFn(document, 'scroll', onLazyload);
        }
      }).bind(this));
    }).bind(this));
    Cookies.setItem('pcache_version', config['version'], null, config['root-path']);
  },
  queryElements: function(queryStrings, callback) {
    // TODO: Consider further optimization
    var elems = [], i;
    // TODO: Add support for lazyload without cache request
    for (i = 0; i < queryStrings.length; i++) {
      var tags = document.getElementsByTagName(queryStrings[i]);
      for (var j = 0; j < tags.length; j++) {
        if (tags[j].getAttribute('data-cache-url') !== null) {
          elems.push(tags[j]);
        }
      }
    }

    // loop through elements
    var count = 0, length = elems.length;
    for (i = 0; i < elems.length; i++) {
      var cache = new CacheEntry(elems[i]);
      this.entries.push(cache);
      if (cache.lazyload) {
        this.lazyload.push(cache);
        length--;
      } else {
        cache.load((function onCacheLoaded(cache) {
          cache.constructDOM(function() {
            count++;
            if (typeof callback == 'function' && count == length) callback();
          });
        }).bind(this, cache));
      }
    }
    // If all elements are lazy loaded, here's callback trigger.
    if (typeof callback == 'function' && length === 0) callback();
  },
  loadLazyImages: function() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var pageHeight = window.innerHeight || document.documentElement.clientHeight;
    var min = scrollY - (pageHeight/4);
    var max = scrollY + ~~(pageHeight*1.25);
    for (var i = 0; i < this.lazyload.length; i++) {
      var cache = this.lazyload[i];
      var elemY = cache.elem.offsetTop;
      var elemHeight = cache.elem.offsetHeight;
      if (elemY+elemHeight <= min || elemY <= max) {
        cache.load((function onCacheLoaded(cache) {
          cache.constructDOM();
        }).bind(this, cache));
        this.lazyload.splice(i--, 1);
      }
    }
  },
  getEntryByUrl: function(url) {
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].url === url) {
        return this.entries[i];
      }
    }
    return undefined;
  },
  clearAllCache: function() {
    for (var i = 0; i < this.entries.length; i++) {
      this.entries[i].removeCache();
    }
  },
  /**
   * Returns PortableCache configuration
   * @param  {String} property
   * @return Configuration if available. Empty property argument will return config object.
   */
  getConfig: function(property) {
    if (property === undefined) {
      return config;
    } else {
      return config[property];
    }
  }
};

var fs = function(callback, errorCallback) {
  errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;

  if (!requestFileSystem) {
    errorCallback('FileSystem not supported on this browser.');
    return;
  }

  this.fs = null;
  requestFileSystem(TEMPORARY, 1024 * 1024, (function(fs) {
    __debug && console.log('FileSystem initialized');
    this.fs = fs;
    this.ls = new ls();
    if (typeof callback == 'function') callback();
  }).bind(this), function(e) {
    errorCallback('failed initializing FileSystem.');
  });
};
fs.prototype = {
  set: function(_data, callback, errorCallback) {
    var ls = this.ls;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;
  
    var fileName = _data.url.replace(/\/|\./g, '_');
    this.fs.root.getDirectory(STORAGE_NAME, {create: true, exclusive: false},
    function onGetDirectory(directoryEntry) {
      directoryEntry.getFile(fileName, {create: true, exclusive: false},
      function onGetFile(fileEntry) {
        fileEntry.createWriter(function onCreateWriter(writer) {
          writer.onwriteend = function onWriteEnd() {
            _data.src = fileEntry.toURL();
            var data = {
              url:      _data.url,
              src:      _data.src,
              mimetype: _data.mimetype,
              version:  _data.version
            };
            ls.set(data, callback, errorCallback);
          };

          writer.onerror = function onFileWriteError(e) {
            errorCallback('error writing FileSystem: '+e);
          };

          if (typeof _data.content == 'string') {
            writer.write(createBlob(_data.content, _data.mimetype));
          } else {
            writer.write(_data.content);
          }
        });
      },
      function onGetFileError(e) {
        errorCallback('failed setting content: '+e);
      });
    },
    function onGetDirectoryError(e) {
      errorCallback('failed getting directory: '+e);
    });
  },
  get: function(_data, callback, errorCallback) {
    if (!this.ls) {
      errorCallback('storage not ready.');
    } else {
      this.ls.get(_data, callback, errorCallback);
    }
  },
  remove: function(_data, callback, errorCallback) {
    var ls = this.ls;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;
  
    var fileName = _data.url.replace(/\/|\./g, '_');
    this.fs.root.getDirectory(STORAGE_NAME, {create: true, exclusive: false},
    function onGetDirectory(directoryEntry) {
      directoryEntry.getFile(fileName, {create: true, exclusive: false},
      function onGetFile(fileEntry) {
        fileEntry.remove(function onRemove() {
          ls.remove(_data, callback, errorCallback);
        }, function onRemoveError(e) {
          errorCallback('failed removing file: '+e);
        });
      },
      function onGetFileError(e) {
        errorCallback('failed setting content: '+e);
      });
    },
    function onGetDirectoryError(e) {
      errorCallback('failed getting directory: '+e);
    });
  }
};

var idb = function(callback, errorCallback) {
  errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;

  if (!indexedDB) {
    errorCallback('IndexedDB not supported on this browser.');
    return;
  }

  this.db = null;
  this.version = 1;
  var req = indexedDB.open(STORAGE_NAME, this.version);
  req.onsuccess = (function(e) {
    __debug && console.log('IndexedDB initialized');
    this.db = e.target.result;
    if (typeof callback == 'function') callback();
  }).bind(this);
  req.onblocked = function(e) {
    errorCallback('opening IndexedDB blocked: '+e.target.error.message);
  };
  req.onerror = function(e) {
    errorCallback('error on opening IndexedDB: '+e.target.error.message);
  };
  req.onupgradeneeded = (function(e) {
    this.db = e.target.result;
    if (this.db.objectStoreNames.contains('cache')) {
      this.db.deleteObjectStore('cache');
    }
    var store = this.db.createObjectStore('cache', {keyPath: 'url'});
    __debug && console.log('upgraded Indexed database', store);
  }).bind(this);
};
idb.prototype = {
  set: function(_data, callback, errorCallback) {
    // TODO: Store Blob if Firefox?
    var data = {
      url:      _data.url,
      content:  _data.content,
      mimetype: _data.mimetype,
      version:  _data.version
    };
    var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
    req.onsuccess = function(e) {
      if (typeof callback == 'function') callback();
    };
    req.onerror = function() {
      if (typeof errorCallback == 'function')
        errorCallback('error writing IndexedDB: '+req.error.name);
    };
  },
  get: function(_data, callback, errorCallback) {
    callback = typeof callback != 'function' ? function(){} : callback;

    var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(_data.url);
    req.onsuccess = function(e) {
      if (e.target.result) {
        var data = e.target.result;
        callback(data);
      } else {
        callback(null);
      }
    };
    req.onerror = function() {
      if (typeof errorCallback == 'function')
        errorCallback('error getting IndexedDB: '+req.error.name);
    };
  },
  remove: function(_data, callback, errorCallback) {
    var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').delete(_data.url);
    req.onsuccess = function(e) {
      if (typeof callback == 'function') callback();
    };
    req.onerror = function() {
      if (typeof errorCallback == 'function')
        errorCallback('error removing IndexedDB: '+req.error.name);
    };
  }
};

var sql = function(callback, errorCallback) {
  callback = typeof callback != 'function' ? function(){} : callback;

  if (!openDatabase) {
    // Avoid failure on 'load' event after fallback. Needs to figure out what's going on...
    setTimeout(function() {
      errorCallback('WebSQL not supported on this browser.');
    }, 0);
    return;
  }

  this.version = '1.0';
  this.db = openDatabase(STORAGE_NAME, '', 'cache', 1024 * 1024);
  if (this.db.version !== this.version) {
    this.db.changeVersion(this.db.version, this.version, function onChangeVersion(t) {
      t.executeSql('CREATE TABLE cache (url TEXT PRIMARY KEY, content TEXT, mimetype TEXT, version TEXT)');
      callback();
    }, function onChangeVersionError() {
      if (typeof errorCallback == 'function')
        errorCallback('Failed changing WebSQL version.');
    }, function onChangeVersionUpgraded() {
      __debug && console.log('WebSQL Database upgraded.');
    });
  } else {
    __debug && console.log('WebSQL Database initialized.');
    setTimeout(function() {
      callback();
    }, 0);
  }
};
sql.prototype = {
  set: function(_data, callback, errorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('INSERT INTO cache (url, content, mimetype, version) VALUES(?, ?, ?, ?)',
      [ _data.url, _data.content, _data.mimetype, _data.version ],
      function onExecuteSql(t, results) {
        if (typeof callback == 'function') callback();
      },
      function onExecuteSqlError(t, e) {
        if (typeof errorCallback == 'function')
          errorCallback('error writing WebSQL: '+e.message);
      });
    });
  },
  update: function(_data, callback, errorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('UPDATE cache SET mimetype=?, content=?, version=? WHERE url=?',
      [ _data.mimetype, _data.content, _data.version, _data.url ],
      function onExecuteSql(t, results) {
        if (typeof callback == 'function') callback();
      },
      function onExecuteSqlError(t, e) {
        if (typeof errorCallback == 'function')
          errorCallback('error updating WebSQL: '+e.message);
      });
    });
  },
  get: function(_data, callback, errorCallback) {
    callback = typeof callback != 'function' ? function(){} : callback;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;

    this.db.readTransaction(function onReadTransaction(t) {
      t.executeSql('SELECT * FROM cache WHERE url=?', [ _data.url ],
      function onExecuteSql(t, results) {
        if (results.rows.length > 0) {
          var result = results.rows.item(0);
          // copy result since you can't change it as it is
          var data = {
            url:      _data.url,
            content:  result.content,
            mimetype: result.mimetype,
            version:  result.version
          };
          callback(data);
        } else if (results.rows.length === 0) {
          callback(null);
        } else {
          errorCallback('error getting WebSQL data.');
        }
      },
      function onExecuteSqlError(t, e) {
        errorCallback('error getting WebSQL data: '+e.message);
      });
    });
  },
  remove: function(_data, callback, errorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('DELETE FROM cache WHERE url=?', [_data.url],
      function onExecuteSql(t, results) {
        __debug && console.log('[%s] Cache removed from WebSQL.', _data.url);
        if (typeof callback == 'function') callback();
      },
      function onExecuteSqlError(t, e) {
        if (typeof errorCallback == 'function')
          errorCallback('error removing WebSQL cache: '+e.message);
      });
    });
  }
};

var ls = function(callback, errorCallback) {
  if (!localStorage) {
    if (typeof errorCallback == 'function')
      errorCallback('LocalStorage not supported on this browser.');
    return;
  }

  setTimeout(function() {
    if (typeof callback == 'function') callback();
  }, 0);
};
ls.prototype = {
  set: function(_data, callback, errorCallback) {
    var data = {
      src:      _data.src || '',
      content:  _data.content || '',
      mimetype: _data.mimetype,
      version:  _data.version
    };
    setTimeout(function localStorageSet() {
      try {
        localStorage.setItem(_data.url, JSON.stringify(data));
        if (typeof callback == 'function') callback();
      } catch (e) {
        if (typeof errorCallback == 'function')
          errorCallback(e.message);
      }
    }, 0);
  },
  get: function(_data, callback, errorCallback) {
    setTimeout(function localStorageGet() {
      try {
        var data = localStorage.getItem(_data.url) || null;
        if (data) {
          data = JSON.parse(data);
        }
        if (typeof callback == 'function') callback(data);
      } catch (e) {
        if (typeof errorCallback == 'function')
          errorCallback(e.message);
      }
    }, 0);
  },
  remove: function(_data, callback, errorCallback) {
    setTimeout(function localStorageRemove() {
      try {
        localStorage.removeItem(_data.url);
        if (typeof callback == 'function') callback();
      } catch (e) {
        if (typeof errorCallback == 'function')
          errorCallback(e.message);
      }
    }, 0);
  }
};

window.CacheEntry = CacheEntry;
window.CacheManager = new CacheManager();
