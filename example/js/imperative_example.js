var cache = new CacheEntry({
  url: '',
  version: ''
});

// Either cached content or fetched content will be returned
cache.load(function(data) {
  // Use this data for whatever you want
});