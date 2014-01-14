/*! PortableCache - v0.7.1 - 2014-01-14
* https://github.com/agektmr/PortableCache
* Copyright (c) 2014 Eiji Kitamura (agektmr+github@gmail.com); Licensed  */
(function(window, document) {

var config = {
  'version':            '',
  'auto-init':          'yes',
  'root-path':          '/',
  'preferred-storage':  'auto',
  'debug-mode':         'no'
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
 * Creates Blob object
 * @param  {Blob|ArrayBuffer|string}  content   A Content consists of either ArrayBuffer or String to
 *                                              create Blob from. If Blob, return as is.
 * @param  {String}                   mimetype  A mimetype string of the Blob to create.
 * @return {Blob}                               Generated Blob.
 */
var createBlob = function(content, mimetype) {
  var blob = null;
  if (content instanceof Blob) {
    return content;
  }
  // If content is ArrayBuffer and Blob are supported
  if (Blob) {
    try {
      // Android browser fails here
      blob = new Blob([content], {type: mimetype});
    } catch(e) {
      var bb = new BlobBuilder();
      bb.append(content);
      blob = bb.getBlob(mimetype);
    }
  // Are there still browsers with BlobBuilder support?
  } else if (BlobBuilder) {
    var bb = new BlobBuilder();
    bb.append(content);
    blob = bb.getBlob(mimetype);
  }
  return blob;
};

/**
 * Canonicalize URL path.
 * ex) Converts '../css/style.css' into '/app/css/style.css'.
 * @param  {string} path Path portion of URL that could be relatively specified.
 * @return {string}      Path portion of URL absolutely specified.
 */
var canonicalizePath = function(path) {
  if (path.indexOf('http') === 0 || path.indexOf('//') === 0) return path;

  var trim = function(s) {
    return s===''?false:true;
  };
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

/**
 * Resolve url from srcset syntax http://www.w3.org/html/wg/drafts/srcset/w3c-srcset/
 * @param  {string}           src    Default URL
 * @param  {string}           srcset srcset argument
 * @param  {number|undefined} dpr    Device pixel ratio
 * @param  {number|undefined} width  Viewport width
 * @return {string} Parsed and resolved URL
 */
var resolveSrcset = function(src, srcset, dpr, width) {
  if (srcset === null) return src;

  dpr = dpr || window.devicePixelRatio;
  width = width || window.innerWidth;
  var list = srcset.split(/\s*,\s*/g);
  var candidates = [], i = 0, cand;

  candidates.push({url:src, w:Infinity, x:1});
  for (i = 0; i < list.length; i++) {
    var tokens = list[i].split(/\s+/g);
    // Ignore if there's only URL
    if (tokens.length < 2) continue;
    var url = tokens.shift(),
        token, cond = {url: url, x: 1, w: Infinity};
    while (token = tokens.shift(), token !== undefined) {
      var parsed = token.match(/^([0-9\.]+)(w|x)$/);
      // Ignore if this doesn't match the pattern
      if (!parsed || parsed.length !== 3) continue;
      cond[parsed[2]] = parsed[1]*1;
    }
    candidates.push(cond);
  }

  var bestw = Infinity, bestx = 0;
  // find best width
  for (i = 0; i < candidates.length; i++) {
    cand = candidates[i];
    if (width <= cand.w && cand.w <= bestw) {
      bestw = cand.w;
    }
  }
  // find best dpr
  for (i = 0; i < candidates.length; i++) {
    cand = candidates[i];
    // traverse only best width
    if (cand.w !== bestw) continue;
    if (bestx === 0) {
      bestx = cand.x;
    } else if (dpr <= cand.x && (dpr > bestx || cand.x < bestx)) {
      bestx = cand.x;
    }
  }
  // find best candidate
  for (i = 0; i < candidates.length; i++) {
    cand = candidates[i];
    if (cand.x == bestx && cand.w == bestw) {
      return cand.url;
    }
  }
  return src;
};

/**
 * Load images that came into viewport from list of lazyload elements
 * @param  {Array.<CacheEntry>} cacheList An array of CacheEntrys to lazyload
 */
var loadLazyImages = function(cacheList) {
  var scrollY = window.pageYOffset || document.documentElement.scrollTop;
  var pageHeight = window.innerHeight || document.documentElement.clientHeight;
  var min = scrollY - (pageHeight/4);
  var max = scrollY + ~~(pageHeight*1.25);
  for (var i = 0; i < cacheList.length; i++) {
    var cache = cacheList[i];
    var elemY = cache.elem.offsetTop;
    var elemHeight = cache.elem.offsetHeight;
    if (elemY+elemHeight <= min || elemY <= max) {
      cache.load(function onCacheLoaded(cache) {
        cache.constructDOM();
      });
      cacheList.splice(i--, 1);
    }
  }
};

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
 * CacheEntry constructor. Takes either an Object or an HTMLElement.
 * @param {Object|HTMLElement} data   Data object that 
 * @constructor
 */
var CacheEntry = function(entry) {
  this.src        = '';
  this.content    = '';
  this.mimetype   = '';
  this.lazyload   = false;

  if (entry.nodeName) {
    // If entry is an HTMLElement, all properties will be picked from the element.
    this.tag      = entry.nodeName.toLowerCase();
    this.elem     = entry;
    var url = entry.getAttribute('data-cache-url');
    var srcset = entry.getAttribute('data-cache-srcset');
    if (config['version'] != NOT_SUPPORTED) {
      this.url    = canonicalizePath(resolveSrcset(url, srcset));
    } else {
      this.url    = resolveSrcset(url, srcset);
    }
    var version = entry.getAttribute('data-cache-version');
    this.version  = version !== null ? version : config['version'];
    // async for script tag
    this.async    = entry.getAttribute('async') === null ? false : true;
    this.type     = (/^(img|audio|video)/).test(this.tag) ? 'binary' : 'text';
  } else {
    // If entry is an object
    this.tag      = entry.tag || '';
    this.elem     = null;
    this.url      = canonicalizePath(entry.url);
    this.version  = typeof entry.version == 'string' ? entry.version : config['version'];
    this.type     = entry.type || 'text'; // (binary|json|text)
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
    callback = typeof callback != 'function' ? function(){} : callback;

    var cache = this;

    var errorCallback = function(errorMessage) {
      // TODO: Handle cache error for imperative use case
      // ex) quota error still can fetch original resource
      __debug && console.error('[%s] %s.', cache.url, errorMessage);
      callback(cache);
    };

    // If non-supported browser, no version specified, fallback
    if (cache.version === '' || config['version'] == NOT_SUPPORTED) {
      __debug && console.log('[%s] fallback without checking cache.', cache.url);
      callback(cache);
    // If previous version doesn't exist, fetch and construct;
    } else if (config['prev-version'] === null) {
      __debug && console.log('[%s] no version found. fetching.', cache.url);
      cache.fetch(function fetchResponse(data) {
        cache.content  = data.content;
        cache.mimetype = data.mimetype;
        cache.createCache(false, callback, errorCallback);
      }, errorCallback);
    } else {
      // Read cache
      cache.readCache(function onReadCache(data) {
        if (!data) {
          __debug && console.log('[%s] cache not found. fetching...', cache.url);
          cache.fetch(function fetchResponse(data) {
            cache.content  = data.content;
            cache.mimetype = data.mimetype;
            cache.createCache(false, callback, errorCallback);
          }, errorCallback);
        } else if (data.version !== cache.version) {
          __debug && console.log('[%s] deprecated cache found. fetching...', cache.url);
          cache.fetch(function fetchResponse(data) {
            cache.content  = data.content;
            cache.mimetype = data.mimetype;
            cache.createCache(true, callback, errorCallback);
          }, errorCallback);
        } else {
          // If cache exists and is still valid
          cache.src      = data.src || '';
          cache.content  = data.content || '';
          cache.mimetype = data.mimetype;
          __debug && console.log('[%s] cache found. loading.', cache.url);
          callback(cache);
        }
      }, errorCallback);
    }
  },
  readCache: function(callback, errorCallback) {
    if (storage) {
      storage.get(this, callback, function onStorageGetError(e) {
        __debug && console.error('[%s] %s', this.url, e);
        callback(null);
      });
    } else {
      __debug && console.error('[%s] storage not ready', this.url);
      if (typeof errorCallback == 'function')
        errorCallback(null);
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

    var cache = this;
    // At this point, cache.content is either a text or a blob.
    // If received content is Blob and storage is not FileSystem, convert it to DataURL
    if (storage instanceof fs) {
      // TODO: store as Blob if Firefox
      __debug && console.log('[%s] creating Blob cache in FileSystem.', cache.url);
      storage.set(cache, callback, errorCallback);
    } else {
      this.getContentAs('text', function onGetContent(content) {
        cache.content = content;
        __debug && console.log('[%s] creating DataURL cache.', cache.url);
        storage[method](cache, callback, errorCallback, function onQuotaError() {
          // On WebSQL Database, permission request aborts transaction regardless of
          // granted or not. Also, there's no way to detect permission.
          // Second trial may prove.
          if (storage instanceof sql) {
            __debug && console.log('[%s] quota error. second try.', cache.url);
            storage[method](cache, callback, errorCallback, function onSecondQuotaError() {
              errorCallback('second quota error. giving up.');
            });
          } else {
            errorCallback('quota error. giving up.');
          }
        });
      });
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
            errorCallback('XMLHttpRequest was not allowed because of Access-Control-Allow-Origin.');
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
          this.elem.async = this.async;
          this.elem.setAttribute('src', this.src);
          __debug && console.log('[%s] replaced src of <script>', this.url);
          addEventListenerFn(this.elem, 'load', callback);
        } else if (this.content) {
          this.tag = 'script';
          this.elem = document.createElement('script');
          this.elem.async = this.async;
          this.elem.textContent = this.content;
          document.head.appendChild(this.elem);
          __debug && console.log('[%s] inlined to <script>', this.url);
          callback();
          return;
        } else {
          this.elem.async = this.async;
          this.elem.setAttribute('src', this.url);
          __debug && console.log('[%s] fallback to <script>', this.url);
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      case 'link':
        // TODO: link tag isn't necessarily a stylesheet
        // TODO: support templates (angular, handlebar, webcomponents, etc)
        if (this.src) {
          this.elem.setAttribute('href', this.src);
          __debug && console.log('[%s] replaced href of <link>', this.url);
          callback();
        } else if (this.content && this.elem.rel == 'stylesheet') {
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
  getContentAs: function(type, callback) {
    var reader = Blob ? new FileReader() : null;

    if (this.content === '') {
      __debug && console.error('[%s] content not loaded.', this.url);
      callback(null);
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
          callback(null);
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
          callback(null);
        }
        break;
    }
  }
};

var PortableCache = function() {
  this.entries = [];
  this.lazyload = [];

  // Parse configuration
  this.parseConfig();

  var bootstrap = config['auto-init'] != 'no' ? this.bootstrap.bind(this) : function(){};

  // Failing if any of these won't work
  if (config['prev-version'] == NOT_SUPPORTED ||
      document.querySelectorAll === undefined ||
      document.textContent === undefined ||
      document.head === undefined) {
    __debug && console.log('This browser is not supported.');
    config['version'] = NOT_SUPPORTED;
    addEventListenerFn(window, 'load', bootstrap);

  } else {
    var errorCallback = function(errorMessage) {
      __debug && console.log('%s Falling back.', errorMessage);
      storage = null;
      if (config['auto-init'] != 'no') {
        if (document.readyState == 'complete' ||
            document.readyState == 'interactive' ||
            document.readyState == 'loaded') {
          this.bootstrap();
        } else {
          addEventListenerFn(window, 'load', bootstrap);
        }
      }
    };

    // Initialize best available storage
    var ps = config['preferred-storage'];
    storage = (ps=='filesystem'   || (requestFileSystem && ps=='auto')) ?
              new fs(bootstrap, errorCallback.bind(this)) :
              (ps=='idb'          || (indexedDB         && ps=='auto')) ?
              new idb(bootstrap, errorCallback.bind(this)) :
              (ps=='sql'          || (openDatabase      && ps=='auto')) ?
              new sql(bootstrap, errorCallback.bind(this)) :
              (ps=='localstorage' || (localStorage      && ps=='auto')) ?
              new ls(bootstrap, errorCallback.bind(this)) :
              undefined;

    if (!storage) {
      // No available storages found
      __debug && console.log('None of storages are available. Falling back.');
      addEventListenerFn(window, 'load', bootstrap);
    }
  }
};

PortableCache.prototype = {
  bootstrap: function() {
    var onLazyload = (function() {
      if (this.lazyload.length) {
        loadLazyImages(this.lazyload);
      } else {
        removeEventListenerFn(document, 'scroll', onLazyload);
        __debug && console.log('lazyload done. removed `scroll` event');
      }
    }).bind(this);

    // Prevent flash
    document.body.style.display = 'none';
    this.queryTags(['link', 'script'], (function onStyleLoaded() {
      document.body.style.display = 'block';

      if (config['version'] != NOT_SUPPORTED) {
        var ready;
        if (document.createEvent) {
          ready = document.createEvent('HTMLEvents');
          ready.initEvent('pcache-ready', true, false);
        } else {
          ready = new Event('pcache-ready', {bubbles: true, cancelable: false});
        }
        document.dispatchEvent(ready);

        if (__debug && window.performance) {
          var loadingTime = window.performance.timing.loadEventStart - window.performance.timing.requestStart;
          __debug && console.log('pcache-ready:', loadingTime / 1000, 'sec');
          console.timeStamp && console.timeStamp('pcache-ready');
        }
      }

      this.queryTags(['img', 'audio', 'video'], (function onMediaLoaded() {
        // Set lazyload images
        if (this.lazyload.length > 0) {
          addEventListenerFn(document, 'scroll', onLazyload);
        }
      }).bind(this));
    }).bind(this));
    Cookies.setItem('pcache_version', config['version'], null, config['root-path']);
  },
  resolveTag: function(query, callback) {
    var tags  = document.getElementsByTagName(query),
        length = tags.length,
        total = 0, count = 0, index = 0,
        ordered = [], queue = [];

    var onDOMConstruction = function() {
      count++;
      if (total === count && typeof callback == 'function') {
        callback();
      }
    };

    for (var i = 0; i < length; i++) {
      if (tags[i].getAttribute('data-cache-url') !== null) {
        total++;
        var cache = new CacheEntry(tags[i]);
        this.entries.push(cache);
        if (cache.lazyload) {
          total--;
          this.lazyload.push(cache);
        } else {
          if (cache.tag == 'script' && !cache.async) {
            // remember order of script tags to be loaded
            ordered.push(cache);
          }
          cache.load(function onCacheLoaded(cache) {
            if (cache.tag == 'script' && !cache.async) {
              var order = ordered.indexOf(cache);
              queue[order] = cache;
              if (order === index) {
                // continue as long as valid queue exists
                while (queue[index]) {
                  ordered[index++].constructDOM(onDOMConstruction);
                }
              }
            } else {
              cache.constructDOM(onDOMConstruction);
            }
          });
        }
      }
    }
    // In case there were no cachable tags / all img were lazyload
    if (total === 0 && typeof callback == 'function') callback();
  },
  queryTags: function(queries, callback) {
    var count = 0, length = queries.length;
    while (queries.length) {
      this.resolveTag(queries.shift(), function() {
        if (++count == length && typeof callback == 'function')
          callback();
      });
    }
  },
  /**
   * Parse meta[name="portable-cache"] and override global "config"
   * @return {Object} Overridden global "config" object
   */
  parseConfig: function() {
    // Load configuration
    var meta = null;
    if (document.querySelector) {
      meta = document.querySelector('meta[name="portable-cache"]');
    } else {
      var metas = document.getElementsByTagName('meta');
      for (var i = 0; i < metas.length; i++) {
        var name = metas[i].getAttribute('name');
        if (name == 'portable-cache') {
          meta = metas[i];
          break;
        }
      }
    }
    if (meta) {
      // Load configuration
      var content = meta.getAttribute('content');
      var tokens = content.split(/\s*,\s*/g);
      for (var j = 0; j < tokens.length; j++) {
        var t = tokens[j].split('=');
        if (t.length === 2) {
          config[t[0]] = t[1];
        }
      }
    }

    // Previous version number
    config['prev-version'] = Cookies.getItem('pcache_version');

    // Debug mode
    __debug = typeof __debug == 'undefined' &&
              config['debug-mode'] !== 'no' &&
              window.console ? true : false;

    __debug && console.log('configuration loaded:', config);

    return;
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
  set: function(cache, callback, errorCallback, quotaErrorCallback) {
    var ls = this.ls;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;
  
    var fileName = this.convertURL(cache.url);
    this.fs.root.getDirectory(STORAGE_NAME, {create: true, exclusive: false},
    function onGetDirectory(directoryEntry) {
      directoryEntry.getFile(fileName, {create: true, exclusive: false},
      function onGetFile(fileEntry) {
        fileEntry.createWriter(function onCreateWriter(writer) {
          writer.onwriteend = function onWriteEnd() {
            __debug && console.log('[%s] success creating data on FileSystem.', cache.url);
            cache.src = fileEntry.toURL();
            var data = {
              url:      cache.url,
              src:      cache.src,
              mimetype: cache.mimetype,
              version:  cache.version
            };
            ls.set(data, function() {
              callback(cache);
            }, errorCallback,
            function onQuotaError() {
              __debug && console.error('quota error creating data on FileSystem.');
              quotaErrorCallback();
            });
          };

          writer.onerror = function onFileWriteError(e) {
            __debug && console.error('[%s] error creating data on FileSystem: %s', cache.url, e);
            errorCallback('error creating data on FileSystem: '+e);
          };

          if (typeof cache.content == 'string') {
            writer.write(createBlob(cache.content, cache.mimetype));
          } else {
            writer.write(cache.content);
          }
        });
      },
      function onGetFileError(e) {
        errorCallback('error creating data on FileSystem: '+e);
      });
    },
    function onGetDirectoryError(e) {
      errorCallback('error getting directory on FileSystem: '+e);
    });
  },
  get: function(cache, callback, errorCallback) {
    if (!this.ls) {
      __debug && console.info('[%s] LocalStorage not ready', cache.url);
      errorCallback('LocalStorage not ready.');
    } else {
      this.ls.get(cache, (function onLocalStorageGet(data) {
        if (data === null) {
          // If not found, return null
          callback(data);
        } else if (cache.elem === null) {
          // Load blob if imperatively invoked
          var fileName = this.convertURL(cache.url);
          this.fs.root.getDirectory(STORAGE_NAME, {create: true, exclusive: false},
          function onGetDirectory(directoryEntry) {
            directoryEntry.getFile(fileName, {create: false, exclusive: false},
            function onGetFile(fileEntry) {
              // TODO: Check
              fileEntry.file(
              function onFile(file) {
                __debug && console.log('[%s] success getting data on FileSystem', cache.url);
                data.content = file;
                callback(data);
              },
              function(e) {
                // TODO: check error candidates
                __debug && console.error('[%s] error getting data on FileSystem: %s', cache.url, e);
                errorCallback('error getting data on FileSystem: '+e.message);
              });
            },
            function onGetFileError(e) {
              // TODO: error here is transitioning from FileError to DOMError
              __debug && console.error('[%s] error getting data on FileSystem: %s', cache.url, e);
              // Assume NotFoundError for the moment
              errorCallback('error getting data on FileSystem'+e);
            });
          },
          function onGetDirectoryError(e) {
            errorCallback('error getting directory on FileSystem: '+e.message);
          });
        } else {
          // If not a imperative request, return as is.
          callback(data);
        }
      }).bind(this), errorCallback);
    }
  },
  remove: function(cache, callback, errorCallback) {
    var ls = this.ls;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;
  
    var fileName = cache.url.replace(/\/|\./g, '_');
    this.fs.root.getDirectory(STORAGE_NAME, {create: true, exclusive: false},
    function onGetDirectory(directoryEntry) {
      directoryEntry.getFile(fileName, {create: true, exclusive: false},
      function onGetFile(fileEntry) {
        fileEntry.remove(function onRemove() {
          ls.remove(cache, callback, errorCallback);
        }, function onRemoveError(e) {
          errorCallback('error removing data on FileSystem: '+e);
        });
      },
      function onGetFileError(e) {
        errorCallback('error removing data on FileSystem: '+e);
      });
    },
    function onGetDirectoryError(e) {
      errorCallback('error getting directory on FileSystem: '+e);
    });
  },
  convertURL: function(url) {
    return url.replace(/\/|\\/g, '_');
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
  set: function(cache, callback, errorCallback, quotaErrorCallback) {
    // TODO: Store Blob if Firefox?
    var data = {
      url:      cache.url,
      content:  cache.content,
      mimetype: cache.mimetype,
      version:  cache.version
    };
    var t = this.db.transaction(['cache'], 'readwrite');
    var req = t.objectStore('cache').put(data);
    t.oncomplete = function(e) {
      __debug && console.log('[%s] success inserting data into IndexedDB', cache.url);
      if (typeof callback == 'function') callback(cache);
    };
    t.onerror = function(e) {
      var error = e.target.error;
      __debug && console.error('[%s] error inserting data into IndexedDB: %s', cache.url, error.name);
      if (typeof errorCallback == 'function')
        errorCallback('error inserting data into IndexedDB: '+error.name);
    };
    t.onabort = function(e) {
      var error = e.target.error;
      __debug && console.error('[%s] error inserting data into IndexedDB: %s', cache.url, error.name);
      if (error.name == 'QuotaExceededError') {
        quotaErrorCallback();
      } else if (typeof errorCallback == 'function') {
        errorCallback('error inserting data into IndexedDB: '+error.name);
      }
    };
  },
  get: function(cache, callback, errorCallback) {
    callback = typeof callback != 'function' ? function(){} : callback;

    var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(cache.url);
    req.onsuccess = function(e) {
      if (e.target.result) {
        __debug && console.log('[%s] success getting data from IndexedDB', cache.url);
        var data = e.target.result;
        callback(data);
      } else {
        callback(null);
      }
    };
    req.onerror = function() {
      __debug && console.error('[%s] error getting data from IndexedDB: %s', cache.url, req.error.name);
      if (typeof errorCallback == 'function')
        errorCallback('error getting data from IndexedDB: '+req.error.name);
    };
  },
  remove: function(cache, callback, errorCallback) {
    var store = this.db.transaction(['cache'], 'readwrite').objectStore('cache');
    var req = store['delete'](cache.url);
    req.onsuccess = function(e) {
      __debug && console.log('[%s] success removing data from IndexedDB', cache.url);
      if (typeof callback == 'function') callback();
    };
    req.onerror = function() {
      __debug && console.error('[%s] error removing data from IndexedDB: %s', cache.url, req.error.name);
      if (typeof errorCallback == 'function')
        errorCallback('error removing data from IndexedDB: '+req.error.name);
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
  set: function(cache, callback, errorCallback, quotaErrorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('INSERT INTO cache (url, content, mimetype, version) VALUES(?, ?, ?, ?)',
      [ cache.url, cache.content, cache.mimetype, cache.version ],
      function onExecuteSql(t, results) {},
      function onExecuteSqlError(t, e) {
        var msg = e.message;
        if (e.code === e.CONSTRAINT_ERR) {
          msg = 'URL already exists in cache. Check version string.';
        }
        if (typeof errorCallback == 'function')
          errorCallback('error inserting data into WebSQL: '+msg);
      });
    },
    function onTransactionError(e) {
      __debug && console.error('[%s] error inserting data into WebSQL: %s', cache.url, e.message);
      if (e.code === e.QUOTA_ERR) {
        quotaErrorCallback();
      } else {
        errorCallback('error inserting data into WebSQL: '+e.message);
      }
    },
    function onTransactionSuccess() {
      __debug && console.log('[%s] success inserting data into WebSQL', cache.url);
      if (typeof callback == 'function') callback(cache);
    });
  },
  update: function(cache, callback, errorCallback, quotaErrorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('UPDATE cache SET mimetype=?, content=?, version=? WHERE url=?',
      [ cache.mimetype, cache.content, cache.version, cache.url ],
      function onExecuteSql(t, results) {},
      function onExecuteSqlError(t, e) {
        if (typeof errorCallback == 'function')
          errorCallback('error updating data on WebSQL: '+e.message);
      });
    },
    function onTransactionError(e) {
      __debug && console.error('[%s] error updating data on WebSQL: %s', cache.url, e.message);
      if (e.code === e.QUOTA_ERR) {
        quotaErrorCallback();
      } else {
        errorCallback('error updating data on WebSQL: '+e.message);
      }
    },
    function onTransactionSuccess() {
      __debug && console.log('[%s] success updating data on WebSQL', cache.url);
      if (typeof callback == 'function') callback(cache);
    });
  },
  get: function(cache, callback, errorCallback) {
    callback = typeof callback != 'function' ? function(){} : callback;
    errorCallback = typeof errorCallback != 'function' ? function(){} : errorCallback;

    this.db.readTransaction(function onReadTransaction(t) {
      t.executeSql('SELECT * FROM cache WHERE url=?', [ cache.url ],
      function onExecuteSql(t, results) {
        if (results.rows.length > 0) {
          var result = results.rows.item(0);
          // copy result since you can't change it as it is
          var data = {
            url:      cache.url,
            content:  result.content,
            mimetype: result.mimetype,
            version:  result.version
          };
          callback(data);
        } else if (results.rows.length === 0) {
          callback(null);
        } else {
          errorCallback('error getting data from WebSQL.');
        }
      },
      function onExecuteSqlError(t, e) {
        errorCallback('error getting data from WebSQL: '+e.message);
      });
    },
    function onTransactionError(e) {
      __debug && console.error('[%s] error getting data from WebSQL: %s', cache.url, e.message);
      errorCallback('error getting WebSQL:'+e.message);
    },
    function onTransactionSuccess() {
      __debug && console.log('[%s] success getting data from WebSQL.', cache.url);
    });
  },
  remove: function(cache, callback, errorCallback) {
    this.db.transaction(function onTransaction(t) {
      t.executeSql('DELETE FROM cache WHERE url=?', [cache.url],
      function onExecuteSql(t, results) {},
      function onExecuteSqlError(t, e) {
        if (typeof errorCallback == 'function')
          errorCallback('error removing WebSQL cache: '+e.message);
      });
    },
    function onTransactionError(e) {
      __debug && console.error('[%s] error removing data from WebSQL: %s', cache.url, e.message);
      errorCallback('error removing WebSQL:'+e.message);
    },
    function onTransactionSuccess() {
      __debug && console.log('[%s] success removing data from WebSQL.', cache.url);
      if (typeof callback == 'function') callback();
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
  set: function(cache, callback, errorCallback, quotaErrorCallback) {
    var data = {
      src:      cache.src || '',
      content:  cache.content || '',
      mimetype: cache.mimetype,
      version:  cache.version
    };
    setTimeout(function localStorageSet() {
      try {
        localStorage.setItem(cache.url, JSON.stringify(data));
        __debug && console.log('[%s] success inserting data into LocalStorage', cache.url);
        if (typeof callback == 'function') callback(cache);
      } catch (e) {
        __debug && console.error('[%s] %s', cache.url, e.message);
        if (e.code === e.QUOTA_EXCEEDED_ERR) {
          quotaErrorCallback();
        } if (typeof errorCallback == 'function') {
            errorCallback(e.message);
        }
      }
    }, 0);
  },
  get: function(cache, callback, errorCallback) {
    setTimeout(function localStorageGet() {
      try {
        var data = localStorage.getItem(cache.url) || null;
        if (data) {
          data = JSON.parse(data);
        }
        __debug && console.log('[%s] success getting data from LocalStorage', cache.url);
        if (typeof callback == 'function') callback(data);
      } catch (e) {
        __debug && console.error('[%s] error getting data from LocalStorage', cache.url);
        if (typeof errorCallback == 'function')
          errorCallback(e.message);
      }
    }, 0);
  },
  remove: function(cache, callback, errorCallback) {
    setTimeout(function localStorageRemove() {
      try {
        localStorage.removeItem(cache.url);
        __debug && console.log('[%s] success removing data from LocalStorage', cache.url);
        if (typeof callback == 'function') callback();
      } catch (e) {
        __debug && console.error('[%s] error removing data from LocalStorage', cache.url);
        if (typeof errorCallback == 'function')
          errorCallback(e.message);
      }
    }, 0);
  }
};

window.CacheEntry = CacheEntry;
window.PortableCache = new PortableCache();


})(window, document);
