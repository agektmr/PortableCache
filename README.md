# PortableCache.js

Cache assets, reduce downloads, load faster.  
[![Analytics](https://ga-beacon.appspot.com/UA-46910666-1/agektmr/PortableCache.js)](https://github.com/igrigorik/ga-beacon)

## What is PortableCache.js?

PortableCache.js is a resource loader with mobile browsers in mind.

* Declarative APIs.
* Uses the best available storage on user's browser:
    * FileSystem
    * IndexedDB
    * WebSQL
    * LocalStorage
* Falls back gracefully when storage is not available.
* Supports lazyload image.
* Supports responsive images (NOT IMPLEMENTED YET).

## Demo

[http://demo.agektmr.com/PortableCache/example/](http://demo.agektmr.com/PortableCache/example/)

## Quick Start

You can quickly try out this library by following 3 steps.

1. Insert following `meta` tag to your existing project's `head` tag.<br/>
   `<meta name="portable-cache" content="version=20131228">`
1. Insert `script` tag to load `portable-cache.min.js` (Make sure it is below 
   `meta[name=""portable-cache]`).<br/>
   `<script 
   src="https://raw.github.com/agektmr/PortableCache.js/0.6.0/dist/portable-cache.min.js">`
1. Replace attribute name of resources you'd like to cache to 
   `data-cache-url`.<br/>
   `<img src="img/image.jpg">`<br/>
   `<img data-cache-url="img/image.jpg">`

## Configuration

Configuration is set by using `meta[name="portable-cache"]`. The `content` 
attribute accepts comma separated parameters as listed below.

    <meta name="portable-cache" content="version=20130627, preferred-storage=localstorage, debug-mode=yes, responsive-image=yes>

<!-- TODO: Fix formatting of cells -->
<table>
<tr>
<th>Key</th>
<th>Value</th>
<th>Default</th>
<th>Details</th>
</tr>
<tr>
<td>version</td>
<td>string</td>
<td>''</td>
<td>Required. String that indicates current version. If this differs from cookie stored previous version, resources will be updated.</td>
</tr>
<tr>
<td>preferred-storage</td>
<td>(auto|filesystem|idb|sql|localstorage)</td>
<td>'auto'</td>
<td>Optional. Preferred storage to use. If the preferred storage is not available on the browser, PCache gracefully falls back.</td>
</tr>
<tr>
<td>root-path</td>
<td>string</td>
<td>'/'</td>
<td>Optional. Cache version usually is tied to the URL path you are on. Specify a root path when you want the cache to be restricted to the directory.</td>
</tr>
<tr>
<td>responsive-image</td>
<td>(yes|no)</td>
<td>'no'</td>
<td>Optional. Indicates if images should load responsive images.
THIS FEATURE NEEDS MORE WORK.</td>
</tr>
<tr>
<td>debug-mode</td>
<td>(yes|no)</td>
<td>'no'</td>
<td>Optional. Enables debug messages in console if 'yes'</td>
</tr>
</table>

## Declarative APIs
### Caching and loading resources

All you have to do is to replace attributes that indicates URL of the resource 
to `data-cache-url`.

#### script

    <script data-cache-url="js/main.js"></script>

#### link

    <link data-cache-url="css/style.css">

#### img

    <img data-cache-url="img/image.jpg">

### Per element versioning

You may want to retain version of certain cached elements. These versions will 
override global version specified in `meta[name="portable-cache"]`.

    <img data-cache-url="img/image.jpg" data-cache-version="20131228">

### Lazyload images

You can defer loading of images until user actually see them in viewport by 
adding `lazyload` attribute.

    <img data-cache-url="img/image.jpg" lazyload>

### Responsive images

You can load responsive image by using `srcset` semantics to 
`img[data-cache-url]`.  
NOT IMPLEMENTED YET.

## Imperative APIs

For configuration, use `meta[name="portable-cache"]` explained at Declarative 
APIs.

### CacheEntry
#### Properties
##### id

ID of this cache.

##### url

URL of this resource that can replace src.

##### src

Source URL to be replaced with (src|href)

##### tag

HTML tag associated

##### type

Request type on XHR (binary|json|text)

##### mimetype

MIME Type of remote resource.

##### version

Cache version string.

##### content

Resource content which is either Blob or text.

##### elem

Original DOM Element.

##### lazyload

Boolean value that indicates if lazyload is requested.

#### Methods
##### load(callback)

TBD

##### readCache(callback, errorCallback)

TBD

##### createCache(cacheExists, callback, errorCallback)

TBD

##### removeCache()

TBD

##### fetch(callback, errorCallback)

TBD

##### constructDOM(callback)

TBD

##### getContentAs(type, callback, errorCallback)

TBD

### Events

PortableCache fires `pcache-ready` event after loading `link` and `script` 
resources.

## Examples
### Simplest Declarative Example

    <!DOCTYPE html>
    <html>
      <head>
        <title>PortableCache Example</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <meta name="portable-cache" content="version=20130630">
        <link rel="stylesheet" data-cache-url="css/bootstrap.css">
        <script src="js/portable-cache.js"></script>
      </head>
      <body>
        <div class="navbar">
          <div class="navbar-inner">
            <div class="container">
              <span class="brand">PortableCache.js</span>
            </div>
          </div>
        </div>

    ...........snip..............

            <h2>Current Status</h2>
            <p>Under development. Very early stage.</p>
            <h2>Example Image Stabs</h2>
            <img data-cache-url="img/abstract1_640x428.jpg" alt="" lazyload>
            <img data-cache-url="img/abstract2_640x441.jpg" alt="" lazyload>
            <img data-cache-url="img/abstract3_640x541.jpg" alt="" lazyload>
            <h2>Author</h2>
            <ul>
              <li>Eiji Kitamura (<a href="http://google.com/+agektmr" target="_blank">+agektmr</a>, <a href="http://twitter.com/agektmr" target="_blank">@agektmr</a>)</li>
            </ul>
          </div>
        </div>
      </body>
    </html>

### AngularJS manual initialization
#### HTML

        <script data-cache-url="js/angular.js"></script>
        <script data-cache-url="js/audio.js"></script>
        <script data-cache-url="js/main.js"></script>
        <script src="js/portable-cache.js"></script>

#### JavaScript

    var app = angular.module('App', []);
    app.directive('aDirective', function($window) {
      ...
    });
    // Invoke Angular manual initialization after pcache-ready event
    document.addEventListener('pcache-ready', function() {
      angular.bootstrap(document, ['App']);
    });

### Imperative cache resource handling

    var map = [
      '/sample/snare.wav',
      '/sample/bass.wav',
      '/sample/hihat.wav'
    ];
    var buffer = [];
    for (var i = 0; i < map.length; i++) {
      (function(i, url) {
        var cache = new CacheEntry({url:url, type:'binary'});
        cache.load(function(cache) {
          cache.getContentAs('arraybuffer', function(b) {
            buffer[i] = c.createBuffer(b, false);
          });
        });
      })(i, map[i]);
    }

## Server side optimization

PortableCache sends a version string of stored in cache as `pcache_version` in 
cookie. Notably, if the browser is already proved to be unsupported, it carries 
a string `NOT_SUPPORTED` instead of a version string. Use this cookie so your 
server can serve an HTML without PortableCache.js in mind to avoid overheads.

## Browser Support

Following browsers are supported by PortableCache.js.

* Chrome (FileSystem API)
* Firefox (IndexedDB)
* IE 9 (LocalStorage)
* IE 10, 11 (IndexedDB)
* Android Browser 2.3 (WebSQL)
* Android Browser 4 (WebSQL)
* Safari 7 (WebSQL)

Following browsers are confirmed gracefully fallbacks on PortableCache.js

* IE 6, 7, 8

Needs test on following browsers

* Android Browser 3 (WebSQL)
* Safari 5 (WebSQL)
* Safari 6 (WebSQL)

Browsers not listed here are yet to be tested.

## Author

* Eiji Kitamura ([+agektmr](https://google.com/+agektmr), 
  [@agektmr](https://twitter.com/agektmr))