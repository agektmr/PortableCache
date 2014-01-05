# PortableCache.js

Cache assets, reduce downloads, load faster.

## What is PortableCache.js?

PortableCache.js (PCache) is a resource loader with mobile browsers in mind.

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
1. Insert `script` tag to load PortableCache.js (Make sure it is below 
   `meta[name=""portable-cache]`).<br/>
   `<script 
   src="https://raw.github.com/agektmr/PortableCache.js/master/src/PortableCache.js">`
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
<td>Key</td>
<td>Value</td>
<td>Default</td>
<td></td>
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

You can load responsive image by using `src-set` semantics to 
`img[data-cache-url]`.  
NOT IMPLEMENTED YET.

## Example

    <!DOCTYPE html>
    <html>
      <head>
        <title>PortableCache Example</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <meta name="portable-cache" content="version=20130630">
        <link rel="stylesheet" data-cache-url="css/bootstrap.css">
        <script src="js/PortableCache.js"></script>
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

## Imperative APIs

For configuration, use `meta[name="portable-cache"]` explained at Declarative 
APIs.

### TBD
## Browser Support

<!-- TODO: Fix formatting of cells -->
<table>
<tr>
<td>Browser</td>
<td>Storage</td>
<td>Lazy loading Images</td>
<td>Responsive Images</td>
</tr>
<tr>
<td>Chrome</td>
<td>FileSystem API</td>
<td>Supported</td>
<td>TBD</td>
</tr>
<tr>
<td>Firefox</td>
<td>IndexedDB</td>
<td>Supported</td>
<td>TBD</td>
</tr>
<tr>
<td>Android Browser 4.3</td>
<td>WebSQL</td>
<td>Supported</td>
<td>TBD</td>
</tr>
<tr>
<td>IE 6, 7</td>
<td>N/A</td>
<td>N/A</td>
<td>N/A</td>
</tr>
<tr>
<td>IE 8, 9</td>
<td>LocalStorage</td>
<td>Supported</td>
<td>TBD</td>
</tr>
<tr>
<td>IE 10, 11</td>
<td>IndexedDB</td>
<td>Supported</td>
<td>TBD</td>
</tr>
<tr>
<td>Safari 7</td>
<td>WebSQL</td>
<td>Supported</td>
<td>TBD</td>
</tr>
</table>

* Browsers not listed here are yet to test.

## Author

* Eiji Kitamura ([+agektmr](https://google.com/+agektmr), 
  [@agektmr](https://twitter.com/agektmr))