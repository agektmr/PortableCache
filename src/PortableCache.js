// (function(window, document, undefined) {

var config = {
  'version':            '',
  'responsive-image':   'no',
  'preferred-storage':  'auto',
  'declarative-mode':   'yes',
  'inline-resource':    'no',
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

var storage = null,
    debug   = false;

var SPACER_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

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
  // If Blob and URL are supported
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
  if (entry instanceof HTMLElement) {
    // If entry.elem exists, all properties will be derived from the element.
    this.tag      = entry.nodeName.toLowerCase();
    this.elem     = entry;
    this.url      = entry.getAttribute('data-cache-url');
    this.version  = entry.getAttribute('data-cache-version') || config['version'];
    // TODO: What if lazyload supported natively?
    this.lazyload = entry.getAttribute('lazyload') !== null ? true : false;
  } else {
    this.tag      = entry.tag;
    this.elem     = null;
    this.url      = entry.url;
    this.version  = entry.version || config['version'];
    this.lazyload = entry.lazyload !== undefined ? entry.lazyload : false;
  }

  if (this.tag === 'img') {
    this.elem.src = SPACER_GIF;
    // TODO: Determine size of image responsively
  }
};
CacheEntry.prototype = {
  load: function(callback, errorCallback) {
    // If storage is not available, fallback
    if (!storage) {
      if (debug && console) console.log('[%s] storage is unavailable. falling back.', this.url);
      this.constructDOM(callback);
    // If previous version doesn't exist, fetch and construct;
    } else if (!config['prev-version']) {
      if (debug && console) console.log('[%s] no version found. fetching.', this.url);
      this.fetch((function fetchResponse(data) {
        this.src      = data.src;
        this.content  = data.content;
        this.mimetype = data.mimetype;
        this.createCache(data);
        this.constructDOM(callback);
        if (debug && console) console.log('[%s] fetch succeeded. cached and loading.', this.url);
      }).bind(this), (function fetchError() {
        if (debug && console) console.log('[%s] fetch failed. falling back.', this.url);
        this.constructDOM(callback);
      }).bind(this));
    } else {
      this.readCache((function(data) {
        // If cache doesn't exist
        if (!data) {
          this.fetch((function fetchResponse(data) {
            this.content  = data.content;
            this.mimetype = data.mimetype;
            this.createCache(data);
            this.constructDOM(callback);
            if (debug && console) console.log('[%s] fetch succeeded. cached and loading.', this.url);
          }).bind(this), (function fetchError() {
            if (debug && console) console.log('[%s] fetch failed. falling back.', this.url);
            this.contructDOM(callback);
          }).bind(this));

        // If cache exists
        } else {
          // If cache is deprecated
          if (data.version !== this.version) {
            this.fetch((function fetchResponse(data) {
              this.content  = data.content;
              this.mimetype = data.mimetype;
              this.createCache(data);
              this.constructDOM(callback);
              if (debug && console) console.log('[%s] fetch succeeded. cached and loading.', this.url);
            }).bind(this), (function fetchError() {
              if (debug && console) console.log('[%s] fetch failed. falling back.', this.url);
              this.constructDOM(callback);
            }).bind(this));
          // If cache is still valid
          } else {
            this.src      = data.src || '';
            this.content  = data.content || '';
            this.mimetype = data.mimetype;
            this.constructDOM(callback);
            if (debug && console) console.log('[%s] cache found. loading.', this.url);
          }
        }
      }).bind(this), errorCallback);
    }
  },
  readCache: function(callback, errorCallback) {
    storage.get(this, callback, errorCallback);
  },
  createCache: function() {
    var method = 'set';

    // If cache exists, "update" instead of "insert" only if WebSQL
    if (this.cache_exists && storage instanceof sql) {
      method = 'update';
    }

    // At this point, this.content is either a text or an arraybuffer.
    // If received content is Blob and storage is not FileSystem, convert it to DataURL
    if (storage instanceof fileSystem) {
      try {
        storage.set(this);
      } catch (e) {
        throw e;
      }
    } else if (isBinary(this.tag)) {
      // Convert to DataURL for storage purpose
      var blob = createBlob(this.content, this.mimetype);
      var reader = new FileReader();
      reader.onload = (function(event) {
        this.content = event.target.result;
        try {
          storage[method](this);
        } catch (e) {
          throw e;
        }
      }).bind(this);
      reader.readAsDataURL(blob);
    } else {
      try {
        storage[method](this);
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
    xhr.open('GET', this.url, true);
    // Since Android browser doesn't support 'blob' type on XHR, we use 'arraybuffer' instead
    xhr.responseType = isBinary(this.tag) ? 'arraybuffer' : 'text';
    xhr.onreadystatechange = (function() {
      if (xhr.readyState === 4) {
        var data = {};
        if (xhr.status === 200 || xhr.status === 304) {
          data.mimetype = xhr.getResponseHeader('Content-Type').replace(/^(.*?);.*$/g, '$1');
          data.content = xhr.response;
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
    // At this point, no `src` means either DataURL or text content
    if (!this.src && this.content !== '') {
      if (config['inline-resource'] === 'no') {
        var blob;
        // Convert DataURL into BlobURL 
        if (typeof this.content == 'string' && this.content.indexOf('data') === 0) {
          var binary = atob(this.content.split(',')[1]);
          var array = Array.prototype.map.call(binary, function(char) {
            return char.charCodeAt(0);
          });
          blob = createBlob(new Uint8Array(array), this.mimetype);
        // Convert text content into BlobURL 
        } else {
          blob = createBlob(this.content, this.mimetype);
        }
        this.src = URL.createObjectURL(blob);
        // Don't forget to revoke BlobURL
        addEventListenerFn(this.elem, 'unload', (function domOnUnload() {
          URL.revokeObjectURL(this.src);
        }).bind(this));

      // In case of `link` tag for inline, use `style` instead
      } else if (this.tag === 'link') {
        this.tag = 'style';
      }
    // No contents loaded. fallback
    } else {
      this.src = this.url;
    }

    if (this.tag) {
      switch (this.tag) {
        case 'audio':
        case 'video':
        case 'img':
          this.elem.setAttribute('src', this.src || this.url);
          break;
        case 'script':
          if (this.src) {
            this.elem.setAttribute('src', this.src);
          } else if (this.content) {
            this.elem.textContent = this.content;
          } else {
            this.elem.setAttribute('src', this.url);
          }
          break;
        case 'link':
          this.elem.setAttribute('href', this.src || this.url);
          break;
        case 'style':
          this.elem = document.createElement('style');
          this.elem.textContent = this.content;
          document.getElementsByTagName('head')[0].appendChild(this.elem);
          break;
      }
      addEventListenerFn(this.elem, 'load', callback);
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
              removeEventListenerFn(document, 'scroll', onLazyload);
              if (debug && console) console.log('removed `document.onscroll` event');
            }
          }).bind(this);
          addEventListenerFn(document, 'scroll', onLazyload);
        }
      }).bind(this));
    }).bind(this));
  }).bind(this);

  // Load configuration and viewport
  var _pcache = null, _viewport = null;
  if (document.querySelectorAll) {
    _pcache = document.querySelector('meta[name="portable-cache"]');
    _viewport = document.querySelector('meta[name="viewport"]');
  } else {
    var metas = document.getElementsByTagName('meta');
    for (var i = 0; i < metas.length; i++) {
      var name = metas[i].getAttribute('name');
      if (name === 'portable-cache') {
        _pcache = metas[i];
      }
      if (name === 'viewport') {
        _viewport = metas[i];
      }
    }
  }
  if (_pcache) {
    parseMetaContent(_pcache.getAttribute('content'), config);
  }
  if (_viewport) {
    parseMetaContent(_viewport.getAttribute('content'), viewport);
  }

  config['prev-version'] = Cookies.getItem('pcache_version');
  Cookies.setItem('pcache_version', config['version']);
  debug = config['debug-mode'] !== 'no' ? true : false;

  if (debug && console) console.log('PortableCache config:', config);

  var ps = config['preferred-storage'];
  if (ps=='filesystem' || (requestFileSystem && ps=='auto')) {
    if (debug && console) console.log('FileSystem API is available');
    storage = new fileSystem();

  } else if (ps=='idb' || (indexedDB && ps=='auto')) {
    if (debug && console) console.log('IndexedDB API is available');
    storage = new idb();

  } else if (ps=='sql' || (openDatabase && ps=='auto')) {
    if (debug && console) console.log('WebSQL Database is available');
    storage = new sql();

  } else if (ps=='localstorage' || (localStorage && ps=='auto')) {
    if (debug && console) console.log('LocalStorage is available');
    storage = new ls();

  } else {
    if (debug && console) console.log('None of storages are available. Fallback to simple attribute fix.');
    addEventListenerFn(window, 'load', onReady);
    return;
  }

  // Start when storage is ready
  storage.onready = onReady;
};

CacheManager.prototype = {
  queryElements: function(queryStrings, callback) {
    var elems = [], i;
    for (i = 0; i < queryStrings.length; i++) {
      var query = queryStrings[i];

      // if document.querySelectorAll is supported
      if (document.querySelectorAll) {
        elems = Array.prototype.concat.apply(elems, document.querySelectorAll(query+'[data-cache-url]'));

      // for legacy browsers
      } else {
        var tags = document.getElementsByTagName(query);
        for (var j = 0; j < tags.length; j++) {
          if (tags[j].getAttribute('data-cache-url') !== null) {
            elems.push(tags[j]);
          }
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
          count++;
          if (debug && console) console.log(cache.src, ' loaded.');
          if (typeof callback === 'function' && count == length) callback();
        }).bind(this, cache));
      }
    }
    if (debug && console) console.log(elems);
    if (typeof callback === 'function' && length === 0) callback();
  },
  loadLazyImages: function() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var pageHeight = window.innerHeight || document.documentElement.clientHeight;
    var min = scrollY - (pageHeight/2);
    var max = scrollY + ~(pageHeight*1.5);
    for (var i = 0; i < this.lazyload.length; i++) {
      var cache = this.lazyload[i];
      var elemY = cache.elem.offsetTop;
      var elemHeight = cache.elem.offsetHeight;
      if (elemY+elemHeight >= min || elemY <= max) {
        cache.load();
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
    if (debug && console) console.log('FileSystem initialized');
    this.fs = fs;
    this.ls = new ls();
    this.onready();
  }).bind(this), function(e) {
    throw 'Failed initializing FileSystem';
  });
};
fileSystem.prototype = {
  set: function(_data) {
    var fileName = _data.url.replace(/\/|\./g, '_');
    this.fs.root.getFile(fileName, {create: true, exclusive: false}, (function(fileEntry) {
      // TODO: create custom directory
      fileEntry.createWriter((function(writer) {
        writer.onwriteend = (function() {
          var data = {
            url:      _data.url,
            src:      fileEntry.toURL(),
            mimetype: _data.mimetype,
            version:  _data.version
          };
          this.ls.set(data);
        }).bind(this);

        writer.onerror = (function(e) {
          throw '['+_data.url+'] Error writing FileSystem: '+e;
        }).bind(this);

        writer.write(createBlob(_data.content, _data.mimetype));

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
    if (debug && console) console.log('IndexedDB initialized');
    this.db = e.target.result;
    this.onready();
  }).bind(this);
  req.onblocked = function(e) {
    throw '['+url+'] Opening IndexedDB blocked.'+e.target.errorCode;
  };
  req.onerror = function(e) {
    throw '['+url+'] Error on opening IndexedDB.'+e.target.errorCode;
  };
  req.onupgradeneeded = (function(e) {
    this.db = e.target.result;
    if (this.db.objectStoreNames.contains('cache')) {
      this.db.deleteObjectStore('cache');
    }
    var store = this.db.createObjectStore('cache', {keyPath: 'url'});
    if (debug && console) console.log('upgraded Indexed database', store);
  }).bind(this);
};
idb.prototype = {
  set: function(_data) {
    // TODO: Store Blob if Firefox?
    var data = {
      url:      _data.url,
      content:  _data.content,
      mimetype: _data.mimetype,
      version:  _data.version
    };
    var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
    req.onsuccess = function(e) {
      // Do nothing
    };
    req.onerror = function(e) {
      throw '['+_data.url+'] Error writing IndexedDB: '+e;
    }
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
    }).bind(this), (function sqlOnChangeVersionError(e) {
      throw 'Failed changing WebSQL version.';
    }).bind(this), (function sqlOnChangeVersionUpgraded() {
      if (debug && console) console.log('WebSQL Database upgraded.');
    }).bind(this));
  } else {
    if (debug && console) console.log('WebSQL Database initialized.');
    setTimeout((function() {
      this.onready();
    }).bind(this), 0);
  }
};
sql.prototype = {
  set: function(_data) {
    var data = [ _data.url, _data.content, _data.mimetype, _data.version ];
    this.db.transaction((function sqlOnTransaction(transaction) {
      transaction.executeSql('INSERT INTO cache (url, content, mimetype, version) '+
          'VALUES(?, ?, ?, ?)', data, (function sqlOnExecuteSql(transaction, results) {
      }).bind(this), (function sqlOnTransactionError(e) {
        throw '['+_data.url+'] Error writing WebSQL: '+e.message;
      }).bind(this));
    }).bind(this));
  },
  update: function(_data) {
    var data = [_data.mimetype, _data.content, _data.version, _data.url ];
    this.db.transaction((function sqlOnTransaction(transaction) {
      transaction.executeSql('UPDATE cache SET mimetype=?, content=?, version=? '+
          'WHERE url=?', data, (function sqlOnExecuteSql(transaction, results) {
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
  set: function(_data) {
    var data = {
      src:      _data.src || '',
      content:  _data.content || '',
      mimetype: _data.mimetype,
      version:  _data.version
    };
    setTimeout(function localStorageSet() {
      try {
        localStorage.setItem(_data.url, JSON.stringify(data));
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

// })(window, document);