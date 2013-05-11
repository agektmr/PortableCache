# PortableCache.js
Cache assets, reduce downloads, load faster.

## How to use
All you have to do is to insert tags like following:  

````
    <meta name="cache-version" content="20130510">  
    <link rel="cachable" href="css/bootstrap.css" type="text/css">  
    <link rel="cachable" href="js/bootstrap.js" type="text/javascript">  
    <script src="js/PortableCache.js"></script>
````

1. Add cache version as ```meta``` tag.
2. Add resource link with ```rel="cachable"```.
3. Load PortableCache.js

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

still needs some work on Android legacy browsers.

## Current Status
Under development. Very early stage.

## Author
* Eiji Kitamura ([+agektmr](http://google.com/+agektmr), [@agektmr](http://twitter.com/agektmr))
