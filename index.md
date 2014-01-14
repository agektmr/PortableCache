---
layout: default
---
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
### [PortableCache Example](http://demo.agektmr.com/portable-cache/)

Simplest declarative usage with lazyload images, responsive images.

### [Web Audio Drumpad](http://demo.agektmr.com/drumpad/)

Imperative resource caching with deferred AngularJS bootstrap.

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

## Example Image Stabs

Open DevTools and check how images are stored, lazyload and responsively embedded.

<img data-cache-url="assets/img/abstract1_1024x685.jpg" data-cache-srcset="img/abstract1_320x214.jpg 320w, img/abstract1_640x428.jpg 640w, img/abstract1_640x428.jpg 320w 2x" class="img-responsive" alt="Cached responsive image">
Photo by [Jim Nix / Nomadic](http://www.flickr.com/photos/jimnix/4971254545/)

<img data-cache-url="assets/img/abstract2_864x595.jpg" data-cache-srcset="img/abstract2_320x220.jpg 320w, img/abstract2_640x441.jpg 640w, img/abstract2_640x441.jpg 320w 2x" class="img-responsive" alt="Cached responsive and lazyloaded image" lazyload>

Photo by [zen](http://www.flickr.com/photos/zen/9990061573/)

<img data-cache-url="assets/img/abstract3_1200x1015.jpg" data-cache-srcset="assets/img/abstract3_240x203.jpg 240w, assets/img/abstract3_640x541.jpg 640w, assets/img/abstract3_640x541.jpg 320w 2x" data-cache-version="" class="img-responsive" alt="Uncached responsive and lazyloaded image" lazyload>

Photo by [cobalt123](http://www.flickr.com/photos/cobalt/513184722/)

## Author

### Eiji Kitamura

<img data-cache-url="assets/img/agektmr-s.jpg" class="profile" lazyload>

[+agektmr](https://google.com/+agektmr), [@agektmr](https://twitter.com/agektmr)
