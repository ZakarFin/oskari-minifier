oskari-minifier
===============

NodeJS module for interpreting nls-oskari projects startupsequences and minifying the set of files defined in it to a single JS file and CSS file.

Run with "node index.js <path to appSetup file>
Writes 3 files:
* oskari.js = compiled source based on appsetup
* oskari.css = compiled css based on appsetup
* oskari.log = Validation etc messages

You can include the oskari.js like any JavaScript file to an HTML page with the oskari application and call Oskari.setPreloaded(true); before calling Oskari.app.startApplication(); to use the compiled version of the code.