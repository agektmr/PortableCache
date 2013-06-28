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
    <div class="navbar">
      <div class="navbar-inner">
        <div class="container">
          <span class="brand">PortableCache.js</span>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="hero-unit">
        <h1 class="hidden-phone">ProtableCache.js</h1>
        <p>Cache assets, reduce downloads, load faster.</p>
        <a href="http://github.com/agektmr/PortableCache.js" target="_blank" class="btn btn-primary">View on Github</a>
      </div>
      <div>
        <h2>How to use</h2>
        <p>All you have to do is to insert tags like following:</p>
        <pre>&lt;meta name="cache-version" content="20130510"&gt;
&lt;link rel="cachable" href="css/bootstrap.css" type="text/css"&gt;
&lt;link rel="cachable" href="css/bootstrap-responsive.css" type="text/css"&gt;</pre>
        <ul>
          <li>Add cache version as <code>meta</code> tag.</li>
          <li>Add resource link with <code>rel="cachable"</code>.</li>
          <li>Load PortableCache.js</li>
        </ul>
        <p>Everything else will be taken care of by PortableCache.js.</p>

        <h2>What does it do?</h2>
        <p>PortableCache.js automatically caches all resources indicated as <code>cachable</code> to the best available storage in user's browser.<br/>
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
        <p>Under development. Very early stage.</p>
        <h2>Example Image Stabs</h2>
        <img <? if (!$d) { echo 'data-cache-'; } ?>src="img/121404791_e6a2afda06_b.jpg" alt="">
        <img <? if (!$d) { echo 'data-cache-'; } ?>src="img/3672537740_7a1a3e63fd_b.jpg" alt="">
        <img <? if (!$d) { echo 'data-cache-'; } ?>src="img/4316514826_81562d1207_b.jpg" alt="">
        <img <? if (!$d) { echo 'data-cache-'; } ?>src="img/4453502862_e9999a219e_b.jpg" alt="">
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