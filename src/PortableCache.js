var PortableCache = (function() {
  var debug       = true,
      _useDataURL = false,
      storage     = null;

  /**
   * <meta name="cache-version" content="20130406">
   * <meta name="cache-preferred-storage" content="file-system"> // sql, idb, localstorage
   * <link rel="stylesheet" data-cache-href="..." data-cache-version="">
   * <script data-cache-src="...">
   */

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

  var webSQL            = window.openDatabase ||
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

  var isBlobType = function(type) {
    return type.match(/^(image|audio|video)/) ? true : false;
  };

  var CacheEntry = function(resource_url, version, elem) {
    this.origin_url   = resource_url;
    this.version      = version;
    this.content      = '';
    this.status       = '';
    this.url          = '';
    this.cache_exists = false;

    this.elem = elem;
    if (elem) {
      this.type = elem.nodeName === 'LINK'    ? 'text/css' :
                  elem.nodeName === 'SCRIPT'  ? 'text/javascript' :
                  elem.nodeName === 'IMG'     ? 'image/*' :
                  elem.nodeName === 'AUDIO'   ? 'audio/*' :
                  elem.nodeName === 'VIDEO'   ? 'video/*' :
                  undefined;
    } else {
      // Guess resource content type from url extension
      switch (resource_url.substring(resource_url.lastIndexOf('.'))) {
        case '.css':
          this.type = 'text/css';
          break;

        case '.js':
          this.type = 'text/javascript';
          break;

        case '.jpg':
        case '.jpeg':
          this.type = 'image/jpeg';
          break;

        case '.gif':
          this.type = 'image/gif';
          break;

        case '.png':
          this.type = 'image/png';
          break;

        case '.webp':
          this.type = 'image/webp';
          break;

        case '.wav':
          this.type = 'audio/wav';
          break;

        case '.mp3':
          this.type = 'audio/mp3';
          break;

        case '.mp4':
          this.type = 'video/mp4';
          break;
      }
    }

    // no version, no cache
    if (this.version === '') {
      this.url = this.origin_url;
      this.getElement();
      throw '['+this.origin_url+'] version not specified. fallback to source origin url.';
    }
  };
  CacheEntry.prototype = {
    process: function() {
      var that = this;
      var errorCallback = function(e) {
        // In any trouble, just fallback to simple "data-cache-url > url" replacement
        if (debug) console.error(e);
        console.log("[%s] this browser does't seem to support storage features.", that.origin_url);
        that.url = that.origin_url;
        that.getElement();
      };

      // Load cache
      this.loadCache(function(data) {
        // If
        // - no cache found
        // - previous fetch failed
        // - version is different
        // go fetch and cache new resource
        if (!data || (data.status !== 200 && data.status !== 304) || data.version !== that.version) {
          // If the failure is permanent, just update
          if (data && data.status === 0) {
            if (debug) console.log('[%s] cache is permanently unavailable. replacing element.', that.origin_url);
            that.url      = that.origin_url;
            that.status   = data.status;
            that.type     = data.type;
            that.content  = data.content;
            that.version  = data.version;
            that.getElement();
          } else {
            if (debug) console.log('[%s] cache unavailable. fetching...', that.origin_url);
            // Fetch and cache new resource
            that.fetchAndCache(function(data) {
              that.url      = data.url;
              that.content  = data.content;
              that.type     = data.type;
              that.status   = data.status;

              // Update element
              if (debug) console.log('[%s] cache has been updated. replacing element.', that.origin_url);
              that.getElement();

            }, errorCallback);
          }
        } else {
          // If cache is still valid, use them
          if (debug) console.log('[%s] cache is still valid. replacing element.', that.origin_url);
          that.url      = data.url;
          that.status   = data.status;
          that.type     = data.type;
          that.content  = data.content;
          that.version  = data.version;
          that.getElement();
        }
      }, errorCallback);
    },

    loadCache: function(callback, errorCallback) {
      if (storage) {
        storage.get(this.origin_url, this.type, (function(data) {
          // If cached content is DataURL converted from Blob, return it back to Blob
          if (data) {
            if (data.content && isBlobType(data.type) && !(storage instanceof fileSystem)) {
              // use data url as actual url
              if (_useDataURL) {
                data.url = data.content;

              // use blob url
              } else {
                var binary = atob(data.content.split(',')[1]);
                var array = [];
                for (var i = 0; i < binary.length; i++) {
                  array.push(binary.charCodeAt(i));
                }
                data.content = createBlob(new Uint8Array(array), data.type);
              }
            }
            // record cache existance for later WebSQL "update" purpose
            this.cache_exists = true;
          }
          callback(data);
        }).bind(this), errorCallback);
      } else {
        // Simplely move origin_url to url when storage is not available
        if (debug) console.log('['+this.origin_url+'] storage not available.');
        callback({
          url:    this.origin_url,
          type:   this.type,
          status: 200
        });
      }
    },

    createCache: function(url, type, content, status, version, callback, errorCallback) {
      var method = 'set';

      // If cache exists, "update" instead of "insert" for WebSQL
      if (this.cache_exists && storage instanceof sql) {
        method = 'update';
      }
      // If received content is Blob and not using FileSystem, convert it to DataURL
      if (isBlobType(this.type) && !(storage instanceof fileSystem)) {
        var reader = new FileReader();
        reader.onload = (function(e) {
          content = e.target.result;
          storage[method](url, type, content, status, version, callback, errorCallback);
        }).bind(this);
        reader.readAsDataURL(content);
      } else {
        storage[method](url, type, content, status, version, callback, errorCallback);
      }
    },

    removeCache: function() {
      storage.remove(this.origin_url);
    },

    getCachedUrl: function() {
      return this.url;
    },

    fetchAndCache: function(callback, errorCallback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', this.origin_url, true);
      if (isBlobType(this.type)) {
        xhr.responseType = 'blob';
      }
      xhr.onreadystatechange = (function() {
        if (xhr.readyState === 4) {
          var content,
              type = this.type;
          if (xhr.status === 200 || xhr.status === 304) {
            if (debug) console.log('['+this.origin_url+'] fetch succeeded.');
            content = xhr.response;
            // type = xhr.getResponseHeader('Content-Type');

          } else if (xhr.status === 0) {
            // replace status code with cross domain if it is
            if (this.origin_url.indexOf(window.location.origin) === -1) {
              console.error('XMLHttpRequest cannot load %s. '+
                            'Origin %s is not allowed by Access-Control-Allow-Origin.',
                            this.origin_url, window.location.origin);
            } else {
              console.error('XMLHttpRequest unknown error.');
            }

          } else {
            console.error('XMLHttpRequest error:', xhr.status, this.origin_url);

          }

          this.createCache(this.origin_url, type, content, xhr.status, this.version, callback, errorCallback);
        }
      }).bind(this);
      xhr.send();
    },

    getElement: function() {
      var blob    = null;

      var onloadHandler = function(e) {
        if (this.url.indexOf('blob') === 0) {
          if (debug) console.log('revoked object url', this.url);
          URL.revokeObjectURL(this.url);
        }
        if (debug) console.log('resource loaded', this.origin_url);
        if (window.performance) {
          var loadingTime = window.performance.timing.navigationStart + window.performance.now()
                            - window.performance.timing.requestStart;
          console.log('loading time since requestStart:', loadingTime / 1000, 'sec');
        }
        if (console.timeStamp) {
          console.timeStamp('resource loaded: '+this.origin_url);
        }
        if (typeof this.onload === 'function') this.onload();
      };

      if (this.url === '') {
        blob = createBlob(this.content, this.type);

        // In case both Blob nor URL aren't supported
        if (blob === null || !URL) {
          switch (this.type) {
            case 'text/css':
              var style = document.createElement('style');
              style.textContent = this.content;
              this.elem.parentNode.insertBefore(style, this.elem);
              this.elem.parentNode.removeChild(this.elem);
              break;

            case 'text/javascript':
              // async load yet in order: http://www.html5rocks.com/en/tutorials/speed/script-loading/
              if (!this.elem) {
                this.elem = document.createElement('script');
              }
              this.elem.async = false;
              this.elem.textContent = this.content;
              break;

            default:
              // case 'image/*':
              if (this.type.indexOf('image') === 0) {
                if (!this.elem) {
                  this.elem = new Image();
                }
                this.elem.src = this.url;
              } else {
                throw 'cachable link type not specified or unrecognizable';
              }
          }
          return this.elem;
        }
        this.url = URL.createObjectURL(blob);
        this.elem.addEventListener('load', onloadHandler.bind(this));
      }

      // If url is specified, create <link href="..."> or <script src="...">
      switch (this.type) {
        case 'text/css':
          if (!this.elem) {
            this.elem = document.createElement('link');
            this.elem.setAttribute('rel', 'stylesheet');
            this.elem.setAttribute('type', this.type);
          }
          this.elem.setAttribute('href', this.url);
          break;

        case 'text/javascript':
          if (!this.elem) {
            this.elem = document.createElement('script');
          }
          this.elem.setAttribute('src', this.url);
          break;

        default:
          // case 'image/*':
          if (this.type.indexOf('image') === 0) {
            if (!this.elem) {
              this.elem = new Image();
            }
            this.elem.src = this.url;
          } else {
            throw 'cachable link type not specified or unrecognizable';
          }
      }
      this.elem.addEventListener('load', onloadHandler.bind(this));
      return this.elem;
      // TODO: should I dealloc this object?
    }
  };

  var PortableCache = function(preferredStorage, useDataURL) {
    var that = this,
        cvElem, psElem,
        queryStrings = [
          'link[data-cache-href]',
          'script[data-cache-src]',
          'img[data-cache-src]'
        ];

    if (document.querySelector) {
      cvElem = document.querySelector('meta[name="cache-version"]');
      psElem = document.querySelector('meta[name="cache-preferred-storage"]');
      duElem = document.querySelector('meta[name="cache-use-data-url"]');
    } else {
      var metas = document.getElementsByTagName('meta');
      for (var i = 0; i < metas.length; i++) {
        var name = metas[i].getAttribute('name');
        if (name === 'cache-version') {
          cvElem = metas[i];
        }
        if (name === 'cache-preferred-storage') {
          psElem = metas[i];
        }
        if (name === 'cache-use-data-url') {
          duElem = metas[i];
        }
      }
    }

    this.entries = [];
    this.newVersion = cvElem && cvElem.getAttribute('content') || '';
    this.oldVersion = localStorage && localStorage.getItem('cache_version') || '';
    this.preferredStorage = preferredStorage || psElem && psElem.getAttribute('content') || '';
    _useDataURL = duElem && duElem.getAttribute('content') ? true : useDataURL || useDataURL;

// TODO: What if preferred storage is not available ???
    if (this.preferredStorage==='file-system' || (requestFileSystem && this.preferredStorage==='')) {
      if (debug) console.log('FileSystem API is available');
      storage = new fileSystem();

    } else if (this.preferredStorage==='idb' || (indexedDB && this.preferredStorage==='')) {
      if (debug) console.log('IndexedDB API is available');
      storage = new idb();

    } else if (this.preferredStorage==='sql' || (webSQL && this.preferredStorage==='')) {
      if (debug) console.log('WebSQL Database is available');
      storage = new sql();

    } else if (this.preferredStorage==='localstorage' || (localStorage && this.preferredStorage==='')) {
      if (debug) console.log('LocalStorage is available');
      storage = new ls();

    } else {
      if (debug) console.log('None of storages are available. Fallback to simple attribute fix.');
      window.addEventListener('DOMContentLoaded', (function() {
        this.initialize(queryStrings);
      }).bind(this));
      return;
    }

    // For header elements
    storage.onready = function() {
      that.initialize(queryStrings);

      // For body elements
      document.addEventListener('DOMContentLoaded', function() {
        that.initialize([
          'img[data-cache-src]'
        ]);
      });
    };

  };

  PortableCache.prototype = {
    initialize: function(queryStrings) {
      try {
        for (var i = 0; i < queryStrings.length; i++) {
          var elems = [],
              query = queryStrings[i];

          // if document.querySelectorAll is supported
          if (document.querySelectorAll) {
            elems = document.querySelectorAll(query);

          // for legacy browsers
          } else {
            var matches = query.match(/^(.*)\[(.*)\]$/);
            var tags = document.getElementsByTagName(matches[1]);
            for (var k = 0; k < tags.length; k++) {
              if (tags[k].getAttribute(matches[2]) !== null) {
                elems.push(tags[k]);
              }
            }
            console.log(elems);
          }

          // loop through elements
          for (var j = 0; j < elems.length; j++) {
            var elem = elems[j];

            // don't assume elem.dataset is available...
            var resource_url = elem.getAttribute('data-cache-href') || elem.getAttribute('data-cache-src') || '';
            var version = elem.getAttribute('data-cache-version') || this.newVersion;

            try {
              var cache = new CacheEntry(resource_url, version, elem);
              cache.process();
              this.entries.push(cache);
            } catch(e) {
              console.error(e);
              continue;
            }
          }
        }
        localStorage && localStorage.setItem('cache_version', this.newVersion);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },

    getEntries: function() {
      return this.entries;
    },

    getEntryByUrl: function(url) {
      for (var i = 0; i < this.entries.length; i++) {
        if (this.entries[i].origin_url === url) {
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

    createCacheEntry: function(resource_url, version) {
      new CacheEntry(resource_url, version);
      return cache;
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
    set: function(url, type, content, status, version, callback, errorCallback) {
      var data = {
        url:      url,
        type:     type,
        content:  content,
        status:   status,
        version:  version
      }
      // If response code is not 200 on fetch (such as cross domain, 404, 502),
      // it's not possible to store status of the resource. Just simply skip storing
      // phase.
      if (status !== 200 && status !== 304) {
        this.ls.set(url, type, url, status, version, callback);
        return;
      };

      var fileName = url.replace(/\/|\./g, '_');
      this.fs.root.getFile(fileName, {create: true, exclusive: false}, (function(fileEntry) {
        fileEntry.createWriter((function(writer) {
          writer.onwriteend = (function() {
            this.ls.set(url, data.type, fileEntry.toURL(), data.status, data.version, function(data) {
              data.url = fileEntry.toURL();
              callback(data);
            });
          }).bind(this);

          writer.onerror = (function(e) {
            errorCallback('['+url+'] Error writing FileSystem: '+e);
          }).bind(this);

          var blob = new Blob([content], {type: type});
          writer.write(blob);

        }).bind(this));
      }).bind(this), (function(e) {
        errorCallback('['+url+'] Failed setting content: '+e);

      }).bind(this));
    },
    get: function(url, type, callback, errorCallback) {
      this.ls.get(url, type, (function(data) {
        if (data) {
          // fileSystem is using localStorage as metadata store
          callback({
            url:      data.content, // content indicates filesystem:// url
            type:     data.type,
            content:  undefined,
            status:   data.status,
            version:  data.version
          });
        } else {
          callback(data);
        }
      }).bind(this), errorCallback);
    }
  };

  var idb = function() {
    this.db = null;
    this.version = 5;
    var req = indexedDB.open('PortableCache', this.version);
    req.onsuccess = (function(e) {
      if (debug) console.log('IndexedDB initialized');
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
      if (debug) console.log('upgraded Indexed database', store);
    }).bind(this);
  };
  idb.prototype = {
    set: function(url, type, content, status, version, callback, errorCallback) {
      var data = {
        url:      url,
        type:     type,
        content:  content,
        status:   status,
        version:  version
      };
      var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
      req.onsuccess = function(e) {
        // make sure 'url' is updated to storage but callback as empty string
        data.url = '';
        callback(data);
      };
      req.onerror = function(e) {
        errorCallback('['+url+'] Error writing IndexedDB: '+e);
      }
    },
    get: function(url, type, callback, errorCallback) {
      var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(url);
      req.onsuccess = function(e) {
        if (e.target.result) {
          var data = e.target.result;
          // make sure 'url' callbacks as empty string
          data.url = '';
          callback(data);
        } else {
          callback(null);
        }
      };
      req.onerror = function(e) {
        errorCallback('['+url+'] Error getting IndexedDB: '+e);
      };
    }
  };

  var sql = function() {
    this.db = openDatabase('PortableCache', '', 'cache', 1024 * 1024);
    this.version = '2.0';
    if (this.db.version !== this.version) {
      this.db.changeVersion(this.db.version, this.version, (function sqlOnChangeVersion(transaction) {
        transaction.executeSql('CREATE TABLE cache ('+
          'url         TEXT PRIMARY KEY, '+
          'type        TEXT, '+
          'content     TEXT, '+
          'status      INTEGER, '+
          'version     TEXT)');
        this.onready();
      }).bind(this), (function sqlOnChangeVersionError(e) {
        throw 'Failed changing WebSQL version.';
      }).bind(this), (function sqlOnChangeVersionUpgraded() {
        if (debug) console.log('WebSQL Database upgraded.');
      }).bind(this));
    } else {
      if (debug) console.log('WebSQL Database initialized.');
      setTimeout((function() {
        this.onready();
      }).bind(this), 0);
    }
  };
  sql.prototype = {
    set: function(url, type, content, status, version, callback, errorCallback) {
      var data = [url, type, content, status, version ];
      this.db.transaction((function sqlOnTransaction(transaction) {
        transaction.executeSql('INSERT INTO cache (url, type, content, status, version) '+
            'VALUES(?, ?, ?, ?, ?)', data, (function sqlOnExecuteSql(transaction, results) {
          // make sure 'url' is updated to storage but callback as empty string
          data = {
            url:      '',
            type:     type,
            content:  content,
            status:   status,
            version:  version
          };
          callback(data);
        }).bind(this), (function sqlOnTransactionError(e) {
          errorCallback('['+url+'] Error writing WebSQL: '+e);
        }).bind(this));
      }).bind(this));
    },
    update: function(url, type, content, status, version, callback, errorCallback) {
      var data = [type, content, status, version, url ];
      this.db.transaction((function sqlOnTransaction(transaction) {
        transaction.executeSql('UPDATE cache SET type=?, content=?, status=?, version=? '+
            'WHERE url=?', data, (function sqlOnExecuteSql(transaction, results) {
          // make sure 'url' is updated to storage but callback as empty string
          data = {
            url:      '',
            type:     type,
            content:  content,
            status:   status,
            version:  version
          };
          callback(data);
        }).bind(this), (function sqlOnTransactionError(t, e) {
          errorCallback('['+url+'] Error updating WebSQL: '+e);
        }).bind(this));
      }).bind(this));
    },
    get: function(url, type, callback, errorCallback) {
      this.db.readTransaction((function sqlOnReadTransaction(transaction) {
        transaction.executeSql('SELECT * FROM cache WHERE url=?', [url],
            (function sqlOnExecuteSql(transaction, results) {
          if (results.rows.length > 0) {
            var _data = results.rows.item(0);
            // copy result since you can't change it as it is
            var data = {
              url:      '',
              type:     _data.type,
              content:  _data.content,
              status:   _data.status,
              version:  _data.version
            };
            callback(data);

          } else if (results.rows.length === 0) {
            callback(null);

          } else {
            errorCallback('['+url+'] Error getting WebSQL data.');
          }
        }).bind(this), (function sqlOnExecuteSqlError(e) {
          errorCallback('['+url+'] Error getting WebSQL data: '+e);
        }).bind(this));
      }).bind(this), (function sqlOnReadTransactionError(e) {
        errorCallback('['+url+'] Error getting WebSQL data: '+e);
      }).bind(this));
    }
  };

  var ls = function() {
    var that = this;
    setTimeout(function() {
      if (typeof that.onready === 'function') that.onready();
    }, 0);
  };
  ls.prototype = {
    set: function(url, type, content, status, version, callback, errorCallback) {
      var data = {
        url:      url,
        type:     type,
        content:  content,
        status:   status,
        version:  version
      };
      setTimeout(function localStorageSet() {
        try {
          localStorage.setItem(url, JSON.stringify(data));
          // make sure 'url' is set to storage but callback as empty string
          data.url = '';
          callback(data);
        } catch(e) {
          errorCallback('['+url+'] Error setting LocalStorage data: '+e);
        }
      }, 0);
    },
    get: function(url, type, callback, errorCallback) {
      setTimeout(function localStorageGet() {
        try {
          var data = localStorage.getItem(url);
          if (data) {
            data = JSON.parse(data);
            // make sure 'url' callbacks as empty string
            data.url = '';
          }
          callback(data);
        } catch(e) {
          errorCallback('['+url+'] Error getting LocalStorage data: '+e);
        }
      }, 0);
    }
  };

  return new PortableCache();

})();