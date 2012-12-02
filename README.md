oskari-minifier
===============

NodeJS module for interpreting nls-oskari projects startupsequences and minifying the set of files defined in it to a single JS file and CSS file.

1) Install dependencies with "npm -d install".

2) Run with "node index.js [path to appSetup file]

Writes files to the working directory:
* oskari.js = compiled source based on appsetup
* oskari.css = compiled css based on appsetup
* oskari_lang_all.js = localization files that have no language defined based on appsetup
* oskari_lang_[language].js = localization files that have a language defined based on appsetup
* oskari.log = Validation etc messages

You can include the oskari.js and the wanted oskari_lang_*.js like any JavaScript file to an HTML page with the oskari application and call Oskari.setPreloaded(true); before calling Oskari.app.startApplication(); to use the compiled version of the code.