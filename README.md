# PortableCache

[![Analytics](https://ga-beacon.appspot.com/UA-46910666-1/agektmr/PortableCache.js)](https://github.com/igrigorik/ga-beacon)  
Cache assets, reduce downloads, load faster.

## What is PortableCache?

PortableCache is a small library for mobile web developers winning better 
performance. Enables you to cache arbitrary resources (js, css, img, etc) in 
static storage and reduce server request.

* Declarative (no JavaScript required).
* Uses the best available storage on user's browser:
    * FileSystem
    * IndexedDB
    * WebSQL
    * LocalStorage
* Fallback gracefully when no storage mechanism is available.
* Provides imperative APIs for better control.

Bonus points:

* Lazyload images.
* Responsive images using `srcset` syntax.

### Who should use it?

* Responsive web designers.
* Performance enthusiasts.
* Developers who have dreamed of using 
  [ApplicationCache](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html) 
  to reduce traffic.

Unlike AppCache, PortableCache can:

* Permanently cache heavy resources without caching root HTML.
* Update assets without reloading.
* version per content.
* maintain far easier.

## Demo
### [PortableCache](http://demo.agektmr.com/portable-cache/)

Simplest example of using declarative API, lazyload and responsive images.

### [Web Audio Drumpad](http://demo.agektmr.com/drumpad/)

Imperative API usage example. Audio sample data are imperatively cached and used 
as drum sound. It is a good example of deferred AngularJS (1.0.0~) bootstrap. 
Works on Chrome, Safari and Firefox.

## Quick Start

You can quickly try out PortableCache by following 3 steps.

1. Insert following `meta` tag to your existing project's `head` tag.<br/>
   `<meta name="portable-cache" content="version=20131228">`
1. Insert `script` tag to load `portable-cache.js` (Make sure it is below 
   `meta[name="portable-cache"]`).<br/>
   `<script src="js/portable-cache.js">`
1. Replace attribute name of resources you'd like to cache to 
   `data-cache-url`.<br/>
   `<img src="img/image.jpg">`<br/>
   `<img data-cache-url="img/image.jpg">`

## Installing PortableCache

PortableCache is available thorugh [bower](http://bower.io/).

    bower install PortableCache

You can of course clone from repository.

    git clone git@github.com:agektmr/PortableCache.git

### Size (as of 0.7.1)

* plain: 48KB
* minified: 18KB
* gzipped: 6.0KB

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
              <span class="brand">PortableCache</span>
            </div>
          </div>
        </div>

    ...........snip..............

            <h2>Current Status</h2>
            <p>Under development. Very early stage.</p>
            <h2>Example Image Stabs</h2>
            <img data-cache-url="img/abstract1_640x428.jpg"  data-cache-srcset="img/abstract1_320x214.jpg 320w, img/abstract1_640x428.jpg 640w, img/abstract1_640x428.jpg 320w 2x" alt="" lazyload>
            <img data-cache-url="img/abstract2_640x441.jpg" data-cache-srcset="img/abstract2_320x220.jpg 320w, img/abstract2_640x441.jpg 640w, img/abstract2_640x441.jpg 320w 2x" alt="" lazyload>
            <img data-cache-url="img/abstract3_640x541.jpg" data-cache-srcset="img/abstract3_240x203.jpg 240w, img/abstract3_640x541.jpg 640w, img/abstract3_640x541.jpg 320w 2x" alt="" lazyload>
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

    <html ng-app="App">
      ...
        <script data-cache-url="js/angular.js"></script>
        <script data-cache-url="js/audio.js"></script>
        <script data-cache-url="js/main.js"></script>
        <script src="js/portable-cache.js"></script>
      ...

#### JavaScript

    var app = angular.module('App', []);
    app.directive('aDirective', function($window) {
      ...
    });
    // Invoke Angular manual initialization after 'pcache-ready' event.
    document.addEventListener('pcache-ready', function() {
      angular.bootstrap(document, ['App']);
    });

### Imperative cache resource handling

    var map = [
      '/sample/snare.wav',
      '/sample/bass.wav',
      '/sample/hihat.wav'
    ];
    var ctx = new AudioContext();
    var buffers = [];
    for (var i = 0; i < map.length; i++) {
      (function(i, url) {
        var cache = new CacheEntry({url:url, type:'binary'});
        cache.load(function(cache) {
          cache.getContentAs('arraybuffer', function(b) {
            ctx.decodeAudioData(b, function(buffer) {
              buffers[i] = buffer;
            });
          });
        });
      })(i, map[i]);
    }
    var play = function(key) {
      var s = ctx.createBufferSource();
      s.buffer = buffers[key];
      s.connect(ctx.destination);
      s.start(0);
    }

## Configuration

Configuration is set by using `meta[name="portable-cache"]`. The `content` 
attribute accepts comma separated parameters as listed below.

    <meta name="portable-cache" content="version=20130627, preferred-storage=localstorage, root-path=/portable-cache, debug-mode=yes, auto-init=no>

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
<td>auto-init</td>
<td>(yes|no)</td>
<td>'yes'</td>
<td>Optional. You can manually bootstrap PortableCache by setting this 'no'.</td>
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

All you have to do is to replace URL related attributes (such as `src`, `href`) 
of the resource to `data-cache-url`. Currently, following HTML tags are 
supported.

#### script

    <script data-cache-url="js/main.js"></script>

Use `async` attribute to execute the script as soon as it gets loaded. 
Otherwise, scripts will be executed in DOM tree order. `defer` attribute is not 
supported (for natural reason).

    <script data-cache-url="js/main.js" async></script>

#### link[rel="stylesheet"]

    <link rel="stylesheet" data-cache-url="css/style.css">

#### img

    <img data-cache-url="img/image.jpg">

Add `lazyload` attribute to defer loading of images until user actually see them 
in viewport.

    <img data-cache-url="img/image.jpg" lazyload>

Use `data-cache-srcset` with 
[`srcset`](http://www.w3.org/html/wg/drafts/srcset/w3c-srcset/)[ 
semantics](http://www.w3.org/html/wg/drafts/srcset/w3c-srcset/) to load 
responsive images depending on viewport.

    <img data-cache-url="img/image.jpg" data-cache-srcset="img/image-320.jpg 320w, img/image-640.jpg 320w 2w, img/image-640.jpg 640w">

### Per element versioning

You can optionally specify cache versions per element. These versions will 
override global version specified in `meta[name="portable-cache"]`.

    <img data-cache-url="img/image.jpg" data-cache-version="20131228">

As a technique, by assigning empty string to `data-cache-version`, you can skip 
caching resource and apply lazyload and / or responsive image.

    <img data-cache-url="img/image.jpg" data-cache-srcset="img/image-320.jpg 320w, img/image-640.jpg 320w 2w, img/image-640.jpg 640w" data-cache-version="" lazyload>

## Imperative APIs

For configuration, use `meta[name="portable-cache"]` explained at 
[Configuration](#heading=h.22icwdk2g7hl).

### CacheEntry
#### Properties

**url** URL of this resource that can replace `src` when fallback.  
**src** Resource URL to be replaced with `src` or `href`  
**tag** HTML tag associated with this CacheEntry  
**type** Request type on XHR (binary|json|text)  
**mimetype** MIME Type of remote resource.  
**version** Cache version string.  
**content** Resource content which is either Blob or text.  
**elem** Original DOM Element.  
**lazyload** Boolean value that indicates if lazyload is requested.  
**async** Boolean async flag for `script` tag

#### Methods
##### load(callback)

Load resource of specified and resolved URL from cache if possible, otherwise 
from remote server. Returns itself as an argument of callback function.

##### readCache(callback, errorCallback)

Reads cache from a storage. Returns as an argument of callback function (null if 
not found).

##### createCache(cacheExists, callback, errorCallback)

Creates cache in a storage.

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

## FAQ
### What happens if storage's quota exceed?

If quota exceeds on user's browser, PortableCache will simply give up storing 
cache and fallback to use remote resource. But some browsers request permission 
for larger quota to users. On any of those browsers, PortableCache will handle 
gracefully and continue using storage if granted.

### How do I separate cache version per directory?

You may notice version string you have assigned to a website is tied to the 
entire host, potentially overwriting same host's other apps' versions which is 
path separated.  
For example, you have an app on  
[http://example.com/app-a/](http://example.com/app/)  
Then you create another app on  
[http://example.com/app-b/](http://example.com/app-b/)  
In this case, whichever app user opens will overwrite the other app's version 
string.

You can avoid this by giving `root-path` to `meta[name="portable-cache"]`.

    <meta name="portable-cache" content="version=20130110, root-path=/app-a">

This way, the version string is tied to the app path rather than the entire 
host.

### Can I use lazyload / responsive image features without caching?

Absolutely. Just set `data-cache-version` as an empty string. PortableCache will 
simply use remote resource URL with lazyload / srcset features left available.

### Can I detect unsupported browsers on server side?

You may wish to remove PortableCache if a browser is known to be unsupported.  
You can use a version string stored as `pcache_version` in cookie which  
PortableCache sends. If a browser is already proved to be unsupported (fallback 
without caching), it carries a string `NOT_SUPPORTED` instead of a version 
string. Catch this cookie on your server so it can serve an HTML without 
PortableCache to avoid JavaScript parsing overheads.

## Browser Support

Following browsers are supported by PortableCache.

* Chrome (FileSystem API)
* Firefox (IndexedDB)
* IE 9 (LocalStorage)
* IE 10, 11 (IndexedDB)
* Android Browser 2.3 (WebSQL)
* Android Browser 4 (WebSQL)
* Safari 7 (WebSQL)

Following browsers are confirmed to gracefully fallback on PortableCache

* IE 6, 7, 8

Need tests on following browsers

* Android Browser 3 (WebSQL)
* Safari 5 (WebSQL)
* Safari 6 (WebSQL)

Browsers not listed here are yet to be tested.

## Author

* Eiji Kitamura ([+agektmr](https://google.com/+agektmr), 
  [@agektmr](https://twitter.com/agektmr))