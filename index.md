---
layout: default
---
# PortableCache

Cache assets, reduce downloads, load faster.

## What is PortableCache?

[ApplicationCache](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html) 
is an offline enabler that can also speed up your website by reducing   
the number of requests to a server. But there are a few glitches that keeps   
people from using it. You might have wished:

* Permanently cache heavy resources without caching root HTML.
* Update assets without reloading. (AppCache requires page reload.)
* Per content versioning. (AppCache downloads entire resources in manifest 
  again!)

PortableCache is a resource loader for mobile web developers to solve those 
problems.

* Declarative.
* Uses the best available storage on user's browser:
    * FileSystem
    * IndexedDB
    * WebSQL
    * LocalStorage
* Fallback gracefully when no storage mechanisms are available.
* Provides imperative option to handle control.

Bonus points:

* Lazyload images.
* Responsive images using `srcset` syntax.

## Demo
### [PortableCache Example](http://demo.agektmr.com/portable-cache/)

Simplest declarative usage with lazyload images, responsive images.

### [Web Audio Drumpad](http://demo.agektmr.com/drumpad/)

Imperative resource caching with deferred AngularJS bootstrap.

## Quick Start

You can quickly try out this library by following 3 steps.

1. Insert following `meta` tag to your existing project's `head` tag.<br/>
   `<meta name="portable-cache" content="version=20131228">`
1. Insert `script` tag to load `portable-cache.min.js` (Make sure it is below 
   `meta[name="portable-cache"]`).<br/>
   `<script 
   src="https://raw.github.com/agektmr/PortableCache/0.6.0/dist/portable-cache.min.js">`
1. Replace attribute name of resources you'd like to cache to 
   `data-cache-url`.<br/>
   `<img src="img/image.jpg">`<br/>
   `<img data-cache-url="img/image.jpg">`

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
