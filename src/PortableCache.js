(function() {
var config = {
  'version':            '',
  'responsive-image':   'no',
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

var storage   = null,
    debug     = false,
    supported = true;

var SPACER_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
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

var addEventListenerFn = (window.document.addEventListener ?
    function(element, type, fn) { element.addEventListener(type, fn); } :
    function(element, type, fn) { element.attachEvent('on'+type, fn); });

var removeEventListenerFn = (window.document.removeEventListener ?
    function(element, type, fn) { element.removeEventListener(type, fn) } :
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
  this.content  = '';
  this.mimetype = '';
  this.src      = '';
  this.lazyload = false;

  // Check if this is an HTMLElement instance
  if (entry.nodeName) {
    // If entry is an HTMLElement, all properties will be derived from the element.
    this.tag      = entry.nodeName.toLowerCase();
    this.elem     = entry;
    this.url      = entry.getAttribute('data-cache-url');
    this.version  = entry.getAttribute('data-cache-version') || config['version'];
  } else {
    this.tag      = entry.tag;
    this.elem     = null;
    this.url      = entry.url;
    this.version  = entry.version || config['version'];
  }

  // Check if we really should skip legacy browsers
  // if (this.tag === 'img' && document.querySelector) {
  if (this.tag === 'img' && supported) {
    this.elem.src = SPACER_GIF;
    // TODO: What if lazyload supported natively?
    this.lazyload = entry.getAttribute('lazyload') !== null ? true : false;
    // TODO: Determine size of image responsively
  }
};
CacheEntry.prototype = {
  load: function(callback, errorCallback) {
    // If non-supported browser, fallback
    if (!supported) {
      if (debug) console.log('[%s] this browser is not supported. falling back.', this.url);
      callback();
    // If previous version doesn't exist, fetch and construct;
    } else if (config['prev-version'] === null) {
      if (debug) console.log('[%s] no version found. fetching.', this.url);
      this.fetch((function fetchResponse(data) {
        this.content  = data.content;
        this.mimetype = data.mimetype;
        if (debug) console.log('[%s] fetch succeeded. cached and loading.', this.url);
        this.createCache(callback);
      }).bind(this), (function fetchError() {
        if (debug) console.log('[%s] fetch failed. falling back.', this.url);
        callback();
      }).bind(this));
    } else {
      this.readCache((function onReadCache(data) {
        // If cache doesn't exist
        if (!data) {
          this.fetch((function fetchResponse(data) {
            this.content  = data.content;
            this.mimetype = data.mimetype;
            if (debug) console.log('[%s] fetch succeeded. cached and loading.', this.url);
            this.createCache(callback);
          }).bind(this), (function fetchError() {
            if (debug) console.log('[%s] fetch failed. falling back.', this.url);
            callback();
          }).bind(this));

        // If cache exists
        } else {
          // If cache is deprecated
          if (data.version !== this.version) {
            this.fetch((function fetchResponse(data) {
              this.content  = data.content;
              this.mimetype = data.mimetype;
              if (debug) console.log('[%s] fetch succeeded. cached and loading.', this.url);
              this.createCache(callback);
            }).bind(this), (function fetchError() {
              if (debug) console.log('[%s] fetch failed. falling back.', this.url);
              callback();
            }).bind(this));
          // If cache is still valid
          } else {
            this.src      = data.src || '';
            this.content  = data.content || '';
            this.mimetype = data.mimetype;
            if (debug) console.log('[%s] cache found. loading.', this.url);
            callback();
          }
        }
      }).bind(this), errorCallback);
    }
  },
  readCache: function(callback, errorCallback) {
    storage.get(this, callback, errorCallback);
  },
  createCache: function(callback) {
    var method = 'set';

    // If cache exists, "update" instead of "insert" only if WebSQL
    if (this.cache_exists && storage instanceof sql) {
      method = 'update';
    }

    // At this point, this.content is either a text or an arraybuffer.
    // If received content is Blob and storage is not FileSystem, convert it to DataURL
    if (storage instanceof fileSystem) {
      // TODO: store as Blob if Firefox
      if (debug) console.log('Storing Blob as is to FileSystem.');
      try {
        storage.set(this, callback);
      } catch (e) {
        throw e;
      }
    } else if (isBinary(this.tag)) {
      // Convert content to DataURL for storage purpose
      if (Blob && this.content instanceof Blob) {
        if (debug) console.log('Converting Blob to DataURL using FileReader in order to store.');
        var reader = new FileReader();
        reader.onload = (function onReaderLoad(event) {
          if (debug) console.log('Storing DataURL.');
          this.content = event.target.result;
          try {
            storage[method](this, callback);
          } catch (e) {
            throw e;
          }
        }).bind(this);
        reader.readAsDataURL(this.content);
      } else if (this.content instanceof Array) {
        if (debug) console.log('Blob converted to DataURL with manipulation.');
        this.content = 'data:'+this.mimetype+';base64,'+base64encode(this.content);
        try {
          storage[method](this, callback);
        } catch(e) {
          throw e;
        }
      }
    } else {
      if (debug) console.log('Storing text.');
      try {
        storage[method](this, callback);
      } catch (e) {
        throw e;
      }
    }
  },
  removeCache: function() {
    storage.remove(this.url);
  },
  fetch: function(callback, errorCallback) {
    var xhr = new XMLHttpRequest();
    var binaryReady = (typeof xhr.responseType === 'string');
    xhr.open('GET', this.url, true);
    if (binaryReady && isBinary(this.tag)) {
      xhr.responseType = 'blob';
      // If setting 'blob' is rejected, use 'arraybuffer' instead (for Android Browser)
      xhr.responseType = xhr.responseType !== 'blob' ? 'arraybuffer' : 'blob';
    } else if (xhr.overrideMimeType) {
      // Hack if binary is not supported (but non IE)
      xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }
    xhr.onreadystatechange = (function onReadyStateChange() {
      if (xhr.readyState === 4) {
        var data = {};
        if (xhr.status === 200 || xhr.status === 304) {
          data.mimetype = xhr.getResponseHeader('Content-Type').replace(/^(.*?);.*$/g, '$1');
          if (isBinary(this.tag)) {
            if (binaryReady) {
              if (xhr.responseType === 'blob') {
                // Modern browsers
                data.content = xhr.response;
                if (debug) console.log('Loaded binary as Blob.');
              } else if (xhr.responseType === 'arraybuffer') {
                // For Android Browser
                data.content = createBlob(xhr.response, data.mimetype);
                if (debug) console.log('Loaded binary as ArrayBuffer.');
              } else {
                // Other legacy browsers (This won't probably be used)
                var array = [];
                var text = xhr.responseText;
                for (var i = 0; i < text.length; i++) {
                  var c = text.charCodeAt(i);
                  array.push(c & 0xff);
                }
                data.content = createBlob(array, data.mimetype);
                if (debug) console.log('Loaded binary using text manipulation.');
              }
            } else if (VBArray) {
              // For IE 9
              data.content = new VBArray(xhr.responseBody).toArray();
              if (debug) console.log('Loaded binary using VBArray.');
            }
          } else {
            data.content = xhr.responseText;
            if (debug) console.log('Loaded text content.');
          }
        } else if (xhr.status === 0) {
          // replace status code with cross domain if it is
          if (this.url.indexOf(window.location.origin) === -1) {
            errorCallback('XMLHttpRequest cannot load '+this.url+'. '+
                  'Origin '+window.location.origin+' is not allowed by Access-Control-Allow-Origin.');
          } else {
            errorCallback('XMLHttpRequest unknown error.');
          }
        } else {
          errorCallback('XMLHttpRequest error: '+xhr.status+' '+this.url);
        }
        callback(data);
      }
    }).bind(this);
    xhr.send();
  },
  constructDOM: function(callback) {
    callback = typeof callback !== 'function' ? function() {} : callback;

    // At this point, no `src` means either DataURL or text content
    if (!this.src && typeof this.content === 'string' && this.content.indexOf('data:') === 0) {
      this.src = this.content;
    }

    switch (this.tag) {
      case 'audio':
      case 'video':
      case 'img':
        if (this.src) {
          this.elem.setAttribute('src', this.src);
          if (debug) console.log('Replaced src of '+this.tag);
          callback();
        } else {
          this.elem.setAttribute('src', this.url);
          if (debug) console.log('Fallback to '+this.tag);
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      case 'script':
        if (this.src) {
          this.elem.setAttribute('src', this.src);
          if (debug) console.log('Replaced src of script');
          callback();
        } else if (this.content) {
          this.elem.textContent = this.content;
          if (debug) console.log('Inlined to script');
          callback();
          return;
        } else {
          this.elem.setAttribute('src', this.url);
          if (debug) console.log('Fallback to script');
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      case 'link':
        if (this.src) {
          this.elem.setAttribute('href', this.src);
          if (debug) console.log('Replaced href of link');
          callback();
        } else if (this.content) {
          this.tag = 'style';
          this.elem = document.createElement('style');
          this.elem.textContent = this.content;
          document.head.appendChild(this.elem);
          if (debug) console.log('Inserted style tag');
          callback();
        } else {
          this.elem.setAttribute('href', this.url);
          if (debug) console.log('Fallback to link');
          addEventListenerFn(this.elem, 'load', callback);
        }
        break;
      default:
        break;
    }
  }
};

var CacheManager = function() {
  this.entries = [];
  this.lazyload = [];

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

  var onReady = (function() {
    // TODO: move this to earlier position?
    document.body.style.display = 'none';
    this.queryElements(['link', 'script'], (function onStyleLoaded() {
      document.body.style.display = 'block';
      this.queryElements(['img', 'audio', 'video'], (function onMediaLoaded() {
        // Set lazyload images
        if (this.lazyload.length > 0) {
          var onLazyload = (function() {
            if (this.lazyload.length) {
              this.loadLazyImages();
            } else {
              removeEventListenerFn(window, 'scroll', onLazyload);
              if (debug) console.log('removed `document.onscroll` event');
            }
          }).bind(this);
          // Use window instead of document for IE8
          addEventListenerFn(window, 'scroll', onLazyload);
        }
      }).bind(this));
    }).bind(this));
  }).bind(this);

  // Failing if any of these won't work
  if (document.querySelectorAll === undefined ||
      document.textContent === undefined ||
      document.head === undefined) {
    if (window.console) console.log('This browser is not supported. Falling back.');
    supported = false;
    config['version'] = NOT_SUPPORTED;
    addEventListenerFn(window, 'load', onReady);

  } else {
    // Load configuration
    var _pcache = document.querySelector('meta[name="portable-cache"]');
    if (_pcache) {
      parseMetaContent(_pcache.getAttribute('content'), config);
    }

    // Previous version number
    config['prev-version'] = Cookies.getItem('pcache_version');

    // Debug mode
    debug = config['debug-mode'] !== 'no' && window.console ? true : false;

    if (debug) console.log('PortableCache config:', config);

    var ps = config['preferred-storage'];

    // Load viewport
    var _viewport = document.querySelector('meta[name="viewport"]');
    if (_viewport) {
      parseMetaContent(_viewport.getAttribute('content'), viewport);
    }

    try {
      storage = (ps=='filesystem'   || (requestFileSystem && ps=='auto')) ? new fileSystem() :
                (ps=='idb'          || (indexedDB         && ps=='auto')) ? new idb() :
                (ps=='sql'          || (openDatabase      && ps=='auto')) ? new sql() :
                (ps=='localstorage' || (localStorage      && ps=='auto')) ? new ls() : undefined;
    } catch (e) {
      if (debug) console.log('Storage failure. Falling back: ', e);
      // Do not change version in this case
      addEventListenerFn(window, 'load', onReady);
      return;
    }

    if (!storage) {
      // Modern browser without any storage
      supported = false;
      config['version'] = NOT_SUPPORTED;
      if (debug) console.log('None of storages are available. Falling back.');
      addEventListenerFn(window, 'load', onReady);
    } else {
      storage.onready = onReady;
    }
  }

  Cookies.setItem('pcache_version', config['version']);
};

CacheManager.prototype = {
  queryElements: function(queryStrings, callback) {
    var elems = [], i;
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
            if (debug) console.log('[%s] loaded.', cache.url);
            if (typeof callback === 'function' && count == length) callback();
          });
        }).bind(this, cache));
      }
    }
    // If all elements are lazy loaded, here's callback trigger.
    if (typeof callback === 'function' && length === 0) callback();
  },
  loadLazyImages: function() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var pageHeight = window.innerHeight || document.documentElement.clientHeight;
    var min = scrollY - (pageHeight/2);
    var max = scrollY + ~~(pageHeight*1.5);
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

var fileSystem = function() {
  this.fs = null;
  requestFileSystem(TEMPORARY, 1024 * 1024, (function(fs) {
    if (debug) console.log('FileSystem initialized');
    this.fs = fs;
    this.ls = new ls();
    this.onready();
  }).bind(this), function(e) {
    throw 'Failed initializing FileSystem';
  });
};
fileSystem.prototype = {
  set: function(_data, callback) {
    var fileName = _data.url.replace(/\/|\./g, '_');
    this.fs.root.getFile(fileName, {create: true, exclusive: false}, (function(fileEntry) {
      // TODO: create custom directory
      fileEntry.createWriter((function(writer) {
        writer.onwriteend = (function() {
          _data.src = fileEntry.toURL();
          var data = {
            url:      _data.url,
            src:      _data.src,
            mimetype: _data.mimetype,
            version:  _data.version
          };
          this.ls.set(data);
          if (typeof callback === 'function') callback();
        }).bind(this);

        writer.onerror = (function(e) {
          throw '['+_data.url+'] Error writing FileSystem: '+e;
        }).bind(this);

        if (typeof _data.content === 'string') {
          writer.write(createBlob(_data.content, _data.mimetype));
        } else {
          writer.write(_data.content);
        }

      }).bind(this));
    }).bind(this), (function(e) {
      throw '['+url+'] Failed setting content: '+e;

    }).bind(this));
  },
  get: function(_data, callback) {
    this.ls.get(_data, callback);
  },
  remove: function(_data, callback) {
    // TODO;
  }
};

var idb = function() {
  this.db = null;
  this.version = 1;
  var req = indexedDB.open('PortableCache', this.version);
  req.onsuccess = (function(e) {
    if (debug) console.log('IndexedDB initialized');
    this.db = e.target.result;
    this.onready();
  }).bind(this);
  req.onblocked = function(e) {
    throw 'Opening IndexedDB blocked: '+e.target.error.message;
  };
  req.onerror = function(e) {
    throw 'Error on opening IndexedDB: '+e.target.error.message;
  };
  req.onupgradeneeded = (function(e) {
    this.db = e.target.result;
    if (this.db.objectStoreNames.contains('cache')) {
      this.db.deleteObjectStore('cache');
    }
    var store = this.db.createObjectStore('cache', {keyPath: 'url'});
    if (debug) console.log('upgraded Indexed database', store);
  }).bind(this);
};
idb.prototype = {
  set: function(_data, callback) {
    // TODO: Store Blob if Firefox?
    var data = {
      url:      _data.url,
      content:  _data.content,
      mimetype: _data.mimetype,
      version:  _data.version
    };
    var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
    req.onsuccess = function(e) {
      if (typeof callback === 'function') callback();
    };
    req.onerror = function(e) {
      throw '['+_data.url+'] Error writing IndexedDB: '+e;
    };
  },
  get: function(_data, callback) {
    var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(_data.url);
    req.onsuccess = function(e) {
      if (e.target.result) {
        var data = e.target.result;
        // make sure 'url' callbacks as empty string
        callback(data);
      } else {
        callback(null);
      }
    };
    req.onerror = function(e) {
      throw '['+_data.url+'] Error getting IndexedDB: '+e;
    };
  },
  remove: function(_data, callback) {
    // TODO;
  }
};

var sql = function() {
  this.db = openDatabase('PortableCache', '', 'cache', 1024 * 1024);
  this.version = '1.0';
  if (this.db.version !== this.version) {
    this.db.changeVersion(this.db.version, this.version, (function sqlOnChangeVersion(transaction) {
      transaction.executeSql('CREATE TABLE cache ('+
        'url         TEXT PRIMARY KEY, '+
        'content     TEXT, '+
        'mimetype    TEXT, '+
        'version     TEXT)');
      this.onready();
    }).bind(this), function sqlOnChangeVersionError(e) {
      throw 'Failed changing WebSQL version.';
    }, function sqlOnChangeVersionUpgraded() {
      if (debug) console.log('WebSQL Database upgraded.');
    });
  } else {
    if (debug) console.log('WebSQL Database initialized.');
    setTimeout((function() {
      this.onready();
    }).bind(this), 0);
  }
};
sql.prototype = {
  set: function(_data, callback) {
    var data = [ _data.url, _data.content, _data.mimetype, _data.version ];
    this.db.transaction((function sqlOnTransaction(transaction) {
      transaction.executeSql('INSERT INTO cache (url, content, mimetype, version) '+
          'VALUES(?, ?, ?, ?)', data, (function sqlOnExecuteSql(transaction, results) {
        if (typeof callback === 'function') callback();
      }).bind(this), (function sqlOnTransactionError(e) {
        throw '['+_data.url+'] Error writing WebSQL: '+e.message;
      }).bind(this));
    }).bind(this));
  },
  update: function(_data, callback) {
    var data = [_data.mimetype, _data.content, _data.version, _data.url ];
    this.db.transaction((function sqlOnTransaction(transaction) {
      transaction.executeSql('UPDATE cache SET mimetype=?, content=?, version=? '+
          'WHERE url=?', data, (function sqlOnExecuteSql(transaction, results) {
        if (typeof callback === 'function') callback();
      }).bind(this), (function sqlOnTransactionError(t, e) {
        throw '['+_data.url+'] Error updating WebSQL: '+e.message;
      }).bind(this));
    }).bind(this));
  },
  get: function(_data, callback, errorCallback) {
    this.db.readTransaction((function sqlOnReadTransaction(transaction) {
      transaction.executeSql('SELECT * FROM cache WHERE url=?', [_data.url],
          (function sqlOnExecuteSql(transaction, results) {
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
          throw '['+_data.url+'] Error getting WebSQL data.';
        }
      }).bind(this), (function sqlOnExecuteSqlError(e) {
        throw '['+_data.url+'] Error getting WebSQL data: '+e.message;
      }).bind(this));
    }).bind(this), (function sqlOnReadTransactionError(e) {
      throw '['+_data.url+'] Error getting WebSQL data: '+e.message;
    }).bind(this));
  },
  remove: function(_data, callback) {
    // TODO;
  }
};

var ls = function() {
  setTimeout((function() {
    if (typeof this.onready === 'function') this.onready();
  }).bind(this), 0);
};
ls.prototype = {
  set: function(_data, callback) {
    var data = {
      src:      _data.src || '',
      content:  _data.content || '',
      mimetype: _data.mimetype,
      version:  _data.version
    };
    setTimeout(function localStorageSet() {
      try {
        localStorage.setItem(_data.url, JSON.stringify(data));
        if (typeof callback === 'function') callback();
      } catch(e) {
        throw '['+_data.url+'] Error setting LocalStorage data: '+e;
      }
    }, 0);
  },
  get: function(_data, callback) {
    setTimeout(function localStorageGet() {
      try {
        var data = localStorage.getItem(_data.url) || null;
        if (data) {
          data = JSON.parse(data);
        }
        callback(data);
      } catch(e) {
        throw '['+_data.url+'] Error getting LocalStorage data: '+e;
      }
    }, 0);
  },
  remove: function(_data, callback) {
    // TODO;
  }
};

window.CacheEntry = CacheEntry;
window.CacheManager = new CacheManager();

})();