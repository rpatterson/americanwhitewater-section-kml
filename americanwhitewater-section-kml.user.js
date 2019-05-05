// ==UserScript==
// @name         American Whitewater section/run map KML link fix
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Fix the river section/run KML links to return useful KML containing all the points that appear on the map tab.  Useful for downloading the rapid locations with an image if available into external apps such as Google Earth, Locus Map, etc.
// @license GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @author       rpatterson
// @match        https://www.americanwhitewater.org/content/River/detail/id/*
// @grant        none
// ==/UserScript==


(function() {
  'use strict';

  let id_re = /\/content\/River\/detail\/id\/([0-9]+)\/?/;
  let id = document.location.pathname.replace(id_re, '$1');
  let map_elem = document.getElementById('river-main-map');
  let description_re = /([^<]+)(<br>)?(.*)/;
  let kml_parent_xpath = '//section[@id="river-main"]//tbody';
  let link = document.createElement('a');
  let title = `AW-${id} ` + document.title;
  let kml_filename = title + '.kml';
  let kml_elem = document.createElement('tr');
  let kml_link = document.createElement('a');

  // Assemble the placemarks
  let placemarks = eval(map_elem.dataset.dojoProps).map(
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


  // Add a KML link with a data URL for download
  kml_link.setAttribute(
    'href', 'data:application/vnd.google-earth.kml+xml;charset=utf-8,' +
      encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
${placemarks}
  </Document>
</kml>
`));
  kml_elem.appendChild(document.createElement('td'));
  kml_elem.childNodes[0].innerHTML = 'Download Map KML Data';
  kml_elem.appendChild(document.createElement('td'));
  kml_link.setAttribute('download', kml_filename);
  kml_link.text = kml_filename;
  kml_elem.childNodes[1].appendChild(kml_link)
  document.evaluate(
    kml_parent_xpath, document).iterateNext().appendChild(kml_elem);

})();
