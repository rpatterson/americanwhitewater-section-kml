// ==UserScript==
// @name         American Whitewater section/run map KML link fix
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fix the river section/run KML links to return useful KML containing all the points that appear on the map tab.  Useful for downloading the rapid locations with an image if available into external apps such as Google Earth, Locus Map, etc.
// @author       rpatterson
// @match        https://www.americanwhitewater.org/content/River/detail/id/*
// @grant        none
// ==/UserScript==


(function() {
  'use strict';

  // Constants
  var id_re = /\/content\/River\/detail\/id\/([0-9]+)\/?/;
  var description_re = /([^<]+)(<br>)?(.*)/;
  var kml_link_xpath = '//*[@class="feed"]//*[@class="kml"]/parent::a';
  var footer_xpath = '//*[@id="footer"]';
  var link = document.createElement('a');

  function handleRiverMapGadget2map(event) {

    if (event.relatedNode.getAttribute('dojotype') === 'aw.widget.AWMap') {
      var id = document.location.pathname.replace(id_re, '$1');
      var title = document.title.replace('American Whitewater -', `AW-${id}`);
      var kml_link;
      // Assemble the placemarks
      let placemarks = JSON.parse(
        event.relatedNode.getAttribute('jsondata')).map(
          function generatePlacemark(placemark) {
            var srcs_result;
            var srcs = [];
            var src;
            let name = placemark.description.replace(description_re, '$1');
            let description_div = document.createElement('div');
            
            description_div.innerHTML = placemark.description.replace(
              description_re, '$3');

            // Make image URLs absolute and use full-size instead of thumbs
            srcs_result = document.evaluate('//@src', description_div);
            src = srcs_result.iterateNext();
            // Assemble an array
            // since mutating the DOM breaks the XPath iterator
            while (src) {
              srcs.push(src);
              src = srcs_result.iterateNext();
            }
            for (src of srcs) {
              link.href = src.value.replace(
                '/photos/archive/thumb/', '/photos/archive/medium/');
              src.value = link.href;
              src.ownerElement.removeAttribute('style');
            }

            return `    <Placemark>
      <name>AW-${id} ${name}</name>
      <description><![CDATA[${description_div.innerHTML}]]></description>
      <Point>
        <coordinates>${placemark.lng},${placemark.lat},0</coordinates>
      </Point>
    </Placemark>`;
        }).join('\n');


      // Replace the KML link with a data URL for download
      kml_link = document.evaluate(kml_link_xpath, document).iterateNext();
      if (kml_link === null) {
        // KML feed link is missing, create one
        let footer = document.evaluate(footer_xpath, document).iterateNext();
        let kml_div = document.createElement('div');
        footer.appendChild(kml_div);
        kml_div.outerHTML = `<div>
  <div style="" class="CNewsFeedGadget" id="zzqptsmi7vkncu9NewsFeedGadget21">
    <div class="feed">
      <a class="nodecoration">
        <img src="/resources/images/blank.gif" class="kml">
      </a>
      &nbsp; (KML)
      <a class="explain" href="/content/Wiki/rivers:kml:start/">help</a>
      &nbsp;&nbsp;
    </div>
  </div>
</div>`;
      kml_link = document.evaluate(kml_link_xpath, document).iterateNext();
      }
      kml_link.setAttribute(
        'href', 'data:application/octet-stream;charset=utf-8,' +
          encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
${placemarks}
  </Document>
</kml>
`));
      kml_link.setAttribute('download', title + '.kml');
    }
  }
  // TODO switch to a Google Map loaded event of somesort
  document.addEventListener('DOMNodeInserted', handleRiverMapGadget2map);

})();
