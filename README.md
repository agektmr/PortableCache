# PortableCache.js

PortableCache.js caches assets on your mobile site and reduces number of resources to download, resulting in faster load.

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

* FileSystem
* IndexedDB
* WebSQL DB
* LocalStorage

## Current Status
Under development. Very early stage.