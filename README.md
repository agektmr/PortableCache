# PortableCache.js
Cache assets, reduce downloads, load faster.

## How to use
All you have to do is to insert tags like following:  

````
    <meta name="cache-version" content="20130510">  
    <link rel="cachable" href="css/bootstrap.css" type="text/css">  
    <link rel="cachable" href="js/bootstrap.js" type="text/javascript">  
    <script src="js/PortableCache.js"></script>
    // declare global cache version using meta[name=”cache-version”]
    <meta name="cache-version" content="20130627">
    // declare preferred storage to use [file-system, idb, sql, localstorage]
    // without this tag will automatically choose best possible storage
    <meta name="cache-preferred-storage" content="sql">
    // use DataURL instead of ObjectURL using Blob for Blob resources
    // such as image, audio, video
    <meta name="cache-use-data-url" content="true">
    // adding “data-cache-src” or “data-cache-href” attribute will
    // declaratively fetch and replace the tag with cache content if possible
    // request declaration.
    <script data-cache-src="js/bootstrap.js" data-cache-version="20130627">
    <link rel="stylesheet" data-cache-href="css/bootstrap.css" type="text/css">
    <img data-cache-src="img/121404791_e6a2afda06_b.jpg" />
    // “data-cache-version” attribute gives resource specific cache version.
    // this enables users to avoid updating whole assets.
    <script data-cache-src="js/bootstrap.js" data-cache-version="20130623">
    // finally, add PortableCache.js link after scripts declaration.
    <script src="js/PortableCache.js"></script>
````

Everything else will be taken care of by PortableCache.js.

## What does it do?
PortableCache.js automatically caches all resources indicated as ```cachable``` to the best available storage in user's browser.  
Supported storages ordered in priority:

1. FileSystem
2. IndexedDB
3. WebSQL DB
4. LocalStorage

Confirmed it works on:

* Chrome Desktop, Android, iOS
* Firefox Desktop, Android
* Opera Desktop (latest), Android (latest)
* Safari Desktop (latest), iOS (latest)

## Current Status
Under development.

## Author
* Eiji Kitamura ([+agektmr](http://google.com/+agektmr), [@agektmr](http://twitter.com/agektmr))
