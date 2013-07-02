<?php
$d = ($_GET['cm'] == 'pcache' || $_GET['cm'] == null) ? false : true;
// $_GET['du'] will prioritize to use data url for blob cache
// $_GET['s'] specifies type of storage (file-system|idb|sql|localstorage)
// $_GET['cm'] cache-mode: (nocache|appcache|pcache|null)
?>
<!DOCTYPE html>
<html<? if ($_GET['cm']=='appcache') { echo ' manifest="appcache.manifest"'; } ?>>
  <head>
    <title>PortableCache Example</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<? if (!$d) { ?>
    <meta name="cache-version" content="20130628">
<? } if ($_GET['s'] && !$d) { ?>
    <meta name="cache-preferred-storage" content="<?=$_GET['s']?>">
<? } if ($_GET['du'] && !$d) { ?>
    <meta name="cache-use-data-url" content="true">
<? } ?>
    <link rel="stylesheet" <? if (!$d) { echo 'data-cache-'; } ?>href="css/bootstrap.css">
    <link rel="stylesheet" <? if (!$d) { echo 'data-cache-'; } ?>href="css/bootstrap-responsive.css">
<? if (!$d) { ?>
    <script src="../src/PortableCache.js"></script>
<? } ?>
    <script>
      window.addEventListener('load', function(e) {
        if (window.performance) {
          var loadingTime = window.performance.timing.loadEventStart - window.performance.timing.requestStart;
          console.log('onload:', loadingTime / 1000, 'sec');
          console.timeStamp && console.timeStamp('onload');
        }
      });
    </script>
  </head>
  <body>
    <div class="container">
      <div class="hero-unit">
        <h1 class="hidden-phone">PortableCache.js</h1>
        <p>Cache assets, reduce downloads, load faster.</p>
        <a href="http://github.com/agektmr/PortableCache.js" target="_blank" class="btn btn-primary">View on Github</a>
      </div>
      <div>
        <h2>How to use</h2>
        <p>All you have to do is to insert tags like following:</p>
        <pre>// declare global cache version using meta[name=”cache-version”]
&lt;meta name="cache-version" content="20130627"&gt;
// declare preferred storage to use [file-system, idb, sql, localstorage]
// without this tag will automatically choose best possible storage
&lt;meta name="cache-preferred-storage" content="sql"&gt;
// use DataURL instead of ObjectURL using Blob for Blob resources
// such as image, audio, video
&lt;meta name="cache-use-data-url" content="true"&gt;
// adding “data-cache-src” or “data-cache-href” attribute will
// declaratively fetch and replace the tag with cache content if possible
// request declaration.
&lt;script data-cache-src="js/bootstrap.js" data-cache-version="20130627"&gt;
&lt;link rel="stylesheet" data-cache-href="css/bootstrap.css" type="text/css"&gt;
&lt;img data-cache-src="img/121404791_e6a2afda06_b.jpg" /&gt;
// “data-cache-version” attribute gives resource specific cache version.
// this enables users to avoid updating whole assets.
&lt;script data-cache-src="js/bootstrap.js" data-cache-version="20130623"&gt;
// finally, add PortableCache.js link after scripts declaration.
&lt;script src="js/PortableCache.js"&gt;&lt;/script&gt;</pre>
        <p>In declarative mode, everything else will be taken care of by PortableCache.js.</p>

        <h2>What does it do?</h2>
        <p>PortableCache.js automatically caches intended resources to the best possible storage in user's browser.<br/>
        Supported storages ordered in priority:</p>
        <ol>
          <li>FileSystem</li>
          <li>IndexedDB</li>
          <li>WebSQL DB</li>
          <li>LocalStorage</li>
        </ol>
        <p>Confirmed it works on:</p>
        <ul>
          <li>Chrome Desktop, Android, iOS</li>
          <li>Firefox Desktop, Android</li>
          <li>Opera Desktop (latest), Android (latest)</li>
          <li>Safari Desktop (latest), iOS (latest)</li>
        </ul>
        <p>still needs some work on Android legacy browsers.</p>
        <h2>Current Status</h2>
        <p>Under development.</p>
        <h2>Example Image Stabs</h2>
        <p>Photos by <a href="http://www.flickr.com/photos/zb">Gregor Hochmuth</a></p>
        <img data-cache-src="img/121404791_e6a2afda06_b.jpg" alt="">
        <img data-cache-src="img/3672537740_7a1a3e63fd_b.jpg" alt="">
        <img data-cache-src="img/4316514826_81562d1207_b.jpg" alt="">
        <img data-cache-src="img/4453502862_e9999a219e_b.jpg" alt="">
        <h2>Author</h2>
        <ul>
          <li>Eiji Kitamura (<a href="http://google.com/+agektmr" target="_blank">+agektmr</a>, <a href="http://twitter.com/agektmr" target="_blank">@agektmr</a>)</li>
        </ul>
      </div>
    </div>
    <footer>
      <hr/>
    </footer>
  </body>
</html>