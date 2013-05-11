(function() {
  var debug   = true,
      cache   = null,
      storage = null;

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
                          undefined;

  var URL               = window.URL ||
                          window.webkitURL ||
                          window.mozURL ||
                          window.msURL ||
                          window.oURL ||
                          undefined;

  /**
    initialization steps
    - obtain version info
    - look for available storage
    - see if there's cache already exists
    - if there's no cache, fetch content
    - create relevant dom element
    - cache content to best available storage
   */

  var initialize = function() {
    /**
     * <meta name="cache-version" content="20130406">
     * <link rel="cachable" href="" type="text/css">
     * <link rel="cachable" href="" type="text/javascript">
     */
    var cacheVersion = document.querySelector('meta[name="cache-version"]'),
        version = cacheVersion && cacheVersion.getAttribute('content') || '',
        current = localStorage.getItem('cache_version'),
        links = document.querySelectorAll('link[rel="cachable"]');
    Array.prototype.forEach.call(links, function(link) {
      var elem = null;
      cache.load(link, current !== version, function(data) {
        if (data) {
          elem = cache.createElement(link, data);
          link.parentNode.insertBefore(elem, link);
          link.parentNode.removeChild(link);
        } else {
          if (debug) console.log('failed to get cached content', data);
          throw 'PortableCache had problem';
        }
      });
    });
    localStorage.setItem('cache_version', version);
  };

  var fetch = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      if (xhr.status === 200) {
        callback(xhr.responseText);
      } else {
        // TODO
      }
    };
    xhr.send();
  };

  var PortableCache = function() {
    if (requestFileSystem) {
      if (debug) console.log('FileSystem API is available');
      storage = new fileSystem(initialize);

    } else if (indexedDB) {
      if (debug) console.log('IndexedDB API is available');
      storage = new idb(initialize);

    } else if (webSQL) {
      if (debug) console.log('WebSQL Database is available');
      storage = new sql(initialize);

    } else if (localStorage) {
      if (debug) console.log('LocalStorage is available');
      storage = new ls(initialize);

    } else {
      console.log('None of storages are available');
    }
  };

  PortableCache.prototype = {
    load: function(link, requires_update, callback) {
      var url     = link.getAttribute('href');
      var type    = link.getAttribute('type');

      if (!storage) return;

      // New version
      if (requires_update) {
        // Fetch the resource
        fetch(url, (function(content) {
          // Store as cache
          if (debug) console.log('Caching content.');
          storage.set(url, type, content, callback);
        }).bind(this));
      // No change
      } else {
        // See if cache exists
        storage.get(url, type, function(data) {
          if (data) {
            if (debug) console.log('Using cached data.', data);
            callback(data);
          } else {
            fetch(url, function(content) {
              // Store as cache
              if (debug) console.log('Cache not found. Caching content.');
              storage.set(url, type, content, callback);
            });
          }
        });
      }
    },

    createElement: function(link, data) {
      var elem = null;

      if (!data.cache_url) {
        if (Blob && URL) {
          var blob = new Blob([data.content], {type: data.type});
          data.cache_url = URL.createObjectURL(blob);

        // Are there still browsers with BlobBuilder support?
        } else if (window.BlobBuilder && URL) {
          var bb = new BlobBuilder();
          bb.append(data.content);
          var blob = bb.getBlob(data.type);
          data.cache_url = URL.createObjectURL(blob);

        // Inline content in the worst case
        } else if (data.content) {
          // TODO: create inline content
          switch (link.getAttribute('type')) {
            case 'text/css':
              elem = document.createElement('style');
              elem.textContent = data.content;
              break;

            case 'text/javascript':
              elem = document.createElement('script');
              elem.textContent = data.content;
              break;

            default:
              throw 'cachable link type not specified or unrecognizable';
              break;
          }
          // exit if inline
          return elem;
        }
      }

      switch (link.getAttribute('type')) {
        case 'text/css':
          elem = document.createElement('link');
          elem.setAttribute('rel',    'stylesheet');
          elem.setAttribute('href',   data.cache_url);
          break;

        case 'text/javascript':
          elem = document.createElement('script');
          elem.setAttribute('src',    data.cache_url);
          break;

        default:
          throw 'cachable link type not specified or unrecognizable';
          break;
      }

      // elem.setAttribute('title',  link.href);

      // Copy attributes
      for (var i = 0; i < link.attributes.length; i++) {
        var attr = link.attributes[i];
        if (attr.name !== 'href' && attr.name !== 'rel') {
          elem.setAttribute(attr.name, attr.value);
        }
      }

      return elem;
    }
  };

  var fileSystem = function(callback) {
    this.fs = null;
    requestFileSystem(TEMPORARY, 1024 * 1024, (function(fs) {
      if (debug) console.log('FileSystem initialized');
      this.fs = fs;
      callback();
    }).bind(this), function(e) {
      if (debug) console.log('Failed initializing FileSystem');
    });
  };
  fileSystem.prototype = {
    set: function(url, type, content, callback) {
      var fileName = url.replace(/\//g, '_');
      this.fs.root.getFile(fileName, {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.createWriter(function(writer) {
          writer.onwriteend = function() {
            var data = {
              url: url,
              type: type,
              content: content,
              cache_url: fileEntry.toURL()
            };
            callback(data);
          };
          writer.onerror = function(e) {
            if (debug) console.error('Error writing FileSystem', e);
            callback(undefined);
          }
          var blob = new Blob([content], {type: type});
          writer.write(blob);
        });
      }, function(e) {
        if (e.code !== FileError.NOT_FOUND_ERR) {
          if (debug) console.log('Failed setting content', e);
          callback(undefined);
        }
      });
    },
    get: function(url, type, callback) {
      var fileName = url.replace(/\//g, '_');
      this.fs.root.getFile(fileName, {create: false, exclusive: false}, function(fileEntry) {
        if (fileEntry) {
          var data = {
            url: url,
            type: type,
            content: undefined,
            cache_url: fileEntry.toURL()
          };
          callback(data);
        } else {
          if (debug) console.error('Error getting FileSystem', e);
          callback(undefined);
        }
      }, function(e) {
        if (e.code === FileError.NOT_FOUND_ERR) {
          callback(undefined);
        } else {
          console.error(e);
          throw 'FileSystem Error';
        }
      });
    }
  };

  var idb = function(callback) {
    this.db = null;
    this.version = 5;
    var req = indexedDB.open('PortableCache', this.version);
    req.onsuccess = (function(e) {
      if (debug) console.log('IndexedDB initialized');
      this.db = e.target.result;
      callback();
    }).bind(this);
    req.onblocked = function(e) {
      throw 'Opening IndexedDB blocked.'+e.target.errorCode;
    };
    req.onerror = function(e) {
      throw 'Error on opening IndexedDB.'+e.target.errorCode;
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
    set: function(url, type, content, callback) {
      var data = {
        url:      url,
        type:     type,
        content:  content
      };
      var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
      req.onsuccess = function(e) {
        callback(data);
      };
      req.onerror = function(e) {
        if (debug) console.error('Error writing IndexedDB', e);
        callback(false);
      }
    },
    get: function(url, type, callback) {
      var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(url);
      req.onsuccess = function(e) {
        if (e.target.result) {
          callback(e.target.result);
        } else {
          callback(undefined);
        }
      };
      req.onerror = function(e) {
        if (debug) console.error('Error getting IndexedDB', e);
        callback(undefined);
      };
    }
  };

  var sql = function(callback) {
    this.db = openDatabase('PortableCache', '', 'cache', 1024 * 1024);
    this.version = '2.0';
    if (this.db.version !== this.version) {
      this.db.changeVersion(this.db.version, this.version, function(transaction) {
        transaction.executeSql('CREATE TABLE cache ('+
          'url         TEXT PRIMARY KEY, '+
          'type        TEXT, '+
          'content     TEXT)');
      }, function(e) {
        // TODO Error
      }, function() {
        if (debug) console.log('WebSQL Database upgraded');
        setTimeout(callback, 1);
      });
    } else {
      if (debug) console.log('WebSQL Database initialized');
      setTimeout(callback, 1);
    }
  };
  sql.prototype = {
    set: function(url, type, content, callback) {
      var data = [url, type, content ];
      this.db.transaction(function(transaction) {
        transaction.executeSql('INSERT INTO cache (url, type, content) '+
          'VALUES(?, ?, ?)', data, function(transaction, results) {
            var data = {
              url: url,
              type: type,
              content: content
            }
            callback(data);
          }, function(e) {
            if (debug) console.error('Error writing WebSQL', e);
            callback(undefined);
          });
      });
    },
    get: function(url, type, callback) {
      this.db.readTransaction(function(transaction) {
        transaction.executeSql('SELECT * FROM cache WHERE url=?', [url], function(transaction, results) {
          if (results.rows.length) {
            var data = results.rows.item(0);
            callback(data);
          } else {
            if (debug) console.error('Error getting WebSQL');
            callback(undefined);
          }
        }, function(e) {
          // TODO Error
        });
      }, function(e) {
        // TODO Error
      });
    }
  };

  var ls = function(callback) {
    setTimeout(callback, 1);
  };
  ls.prototype = {
    set: function(url, type, content, callback) {
      var data = {
        url: url,
        type: type,
        content: content
      };
      localStorage.setItem(url, JSON.stringify(data));
      callback(data);
    },
    get: function(url, type, callback) {
      var data = localStorage.getItem(url);
      if (data) {
        data = JSON.parse(data);
        callback(data);
      } else {
        callback(undefined);
      }
    }
  };

  cache = new PortableCache();

})();