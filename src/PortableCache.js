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
    var cacheVersion = document.querySelector('meta[name="cache-version"]');
    var links = document.querySelectorAll('link[rel="cachable"]');
    Array.prototype.forEach.call(links, function(link) {
      var version = cacheVersion && cacheVersion.getAttribute('content') || '';
      cache.load(link, version, function(dom) {
        link.parentNode.insertBefore(dom, link);
        link.parentNode.removeChild(link);
      });
    });
  };

  var getURL = function(type, content) {
    if (Blob) {
      var blob = new Blob([content], {type: type});
      return URL.createObjectURL(blob);

    // Are there still browsers with BlobBuilder support?
    } else if (BlobBuilder) {
      var bb = new BlobBuilder();
      bb.append(content);
      var blob = bb.getBlob(type);
      return URL.createObjectURL(blob);

    } else {
      // TODO: create inline content
    }
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
    load: function(link, version, callback) {
      var url = link.getAttribute('href');
      var type = link.getAttribute('type');

      // If no storages are available
      if (storage) {
        // See if cache exists
        storage.get(url, type, version, (function(cache_url) {
          // If not cached
          if (!cache_url) {
            if (debug) console.log('cache not found. fetching.');

            // Fetch the resource
            fetch(url, (function(content) {
              if (debug) console.log('fetched content:', url);

              // Store as cache
              storage.set(url, type, version, content, (function(cache_url) {
                if (cache_url) {
                  if (debug) console.log('content cached');
                  var dom = this.createDOM(link, cache_url);
                  callback(dom);

                } else {
                  callback(undefined);

                }
              }).bind(this));
            }).bind(this));

          // If cached
          } else {
            if (debug) console.log('cache found:', cache_url);
            var dom = this.createDOM(link, cache_url);
            callback(dom);

          }
        }).bind(this));
      }
    },

    createDOM: function(link, url) {
      var type = link.getAttribute('type');
      switch (type) {
        case 'text/css':
          var elem = document.createElement('link');
          elem.setAttribute('rel',    'stylesheet');
          elem.setAttribute('href',   url);
          elem.setAttribute('title',  link.href);

          // Copy attributes
          for (var i = 0; i < link.attributes.length; i++) {
            var attr = link.attributes[i];
            if (attr.name !== 'href' && attr.name !== 'rel') {
              elem.setAttribute(attr.name, attr.textContent);
            }
          }
          return elem;

        case 'text/javascript':
          var elem = document.createElement('script');
          elem.setAttribute('src',    url);
          elem.setAttribute('title',  link.href);

          // Copy attributes
          for (var i = 0; i < link.attributes.length; i++) {
            var attr = link.attributes[i];
            if (attr.name !== 'href' && attr.name !== 'rel') {
              elem.setAttribute(attr.name, attr.textContent);
            }
          }
          return elem;

        default:
          throw 'cachable link type not specified or unrecognizable';
          break;
      }
    },
    clean: function() {
      storage.clean(version);
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
    set: function(url, type, version, content, callback) {
      var fileName = url.replace(/\//g, '_')+'.'+version;
      this.fs.root.getFile(fileName, {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.createWriter(function(writer) {
          writer.onwriteend = function() {
            callback(fileEntry.toURL());
          };
          writer.onerror = function() {
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
    get: function(url, type, version, callback) {
      var fileName = url.replace(/\//g, '_')+'.'+version;
      this.fs.root.getFile(fileName, {create: false, exclusive: false}, function(fileEntry) {
        if (fileEntry) {
          callback(fileEntry.toURL());
        } else {
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
    },
    clean: function(url, type, version) {
      // TODO
    }
  };

  var idb = function(callback) {
    this.db = null;
    this.version = 1;
    var req = indexedDB.open('PortableCache', this.version);
    req.onsuccess = (function(e) {
      if (debug) console.log('IndexedDB initialized');
      this.db = e.target.result;
      callback();
    }).bind(this);
    req.onfailure = function(e) {
      // TODO
    };
    req.onupgradeneeded = (function(e) {
      this.db = e.target.result;
      if (this.db.objectStoreNames.contains('cache')) {
        this.db.deleteObjectStore('cache');
      }
      this.db.createObjectStore('cache', {keyPath: 'url'});
      if (debug) console.log('upgraded Indexed database');
      callback();
    }).bind(this);
  };
  idb.prototype = {
    set: function(url, type, version, content, callback) {
      var data = {
        url:      url,
        type:     type,
        version:  version,
        content:  content
      };
      var req = this.db.transaction(['cache'], 'readwrite').objectStore('cache').put(data);
      req.onsuccess = function(e) {
        var blob = new Blob([content], {type: type});
        callback(URL.createObjectURL(blob));
      };
      req.onerror = function(e) {
        callback(false);
      }
    },
    get: function(url, type, version, callback) {
      var req = this.db.transaction(['cache'], 'readonly').objectStore('cache').get(url);
      req.onsuccess = function(e) {
        if (e.target.result) {
          var blob = new Blob([e.target.result.content], {type: e.target.result.type});
          callback(URL.createObjectURL(blob));
        } else {
          callback(undefined);
        }
      };
      req.onerror = function(e) {
        callback(undefined);
      };
    },
    clean: function() {
      // TODO
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
          'version     TEXT, '+
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
    set: function(url, type, version, content, callback) {
      var data = [url, type, version, content ];
      this.db.transaction(function(transaction) {
        transaction.executeSql('INSERT INTO cache (url, type, version, content) '+
          'VALUES(?, ?, ?, ?)', data, function(transaction, results) {
            console.log(results);
            var blob = new Blob([content], {type: type});
            callback(URL.createObjectURL(blob));
          }, function(e) {
            // TODO Error
          });
      });
    },
    get: function(url, type, version, callback) {
      this.db.readTransaction(function(transaction) {
        transaction.executeSql('SELECT * FROM cache WHERE url=? AND version=?', [url, version], function(transaction, results) {
          if (results.rows.length) {
            var data = results.rows.item(0);
            var blob = new Blob([data.content], {type: data.type});
            callback(URL.createObjectURL(blob));
          } else {
            callback(undefined);
          }
        }, function(e) {
          // TODO Error
        });
      }, function(e) {
        // TODO Error
      });
    },
    clean: function() {
      // TODO
    }
  };

  var ls = function(callback) {
    setTimeout(callback, 1);
  };
  ls.prototype = {
    set: function(url, type, version, content, callback) {
      var data = {
        url: url,
        type: type,
        version: version,
        content: content
      };
      localStorage.setItem(url, JSON.stringify(data));
      var blob = new Blob([content], {type: type});
      callback(URL.createObjectURL(blob));
    },
    get: function(url, type, version, callback) {
      var data = localStorage.getItem(url);
      if (data) {
        data = JSON.parse(data);
        var blob = new Blob([data.content], {type: data.type});
        callback(URL.createObjectURL(blob));
      } else {
        callback(undefined);
      }
    },
    clean: function() {
      // TODO
    }
  };

  cache = new PortableCache();

})();