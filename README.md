oskari-minifier
===============

NodeJS module for interpreting nls-oskari projects startupsequences and minifying the 
set of files defined in it to a compiled JS files and a CSS file or validating the files.

1) Install dependencies with "npm -d install".

2) Run with "node index.js [compile | validate] [path to appSetup file]

Compile writes files to the 'compiled' directory:
* oskari.js = compiled source based on appsetup
* oskari.css = compiled css based on appsetup
* oskari_lang_all.js = localization files that have no language defined based on appsetup
* oskari_lang_[language].js = localization files that have a language defined based on appsetup

Validate writes files to the 'validation' directory:
* [bundle id].txt = Validation messages for bundle

You can include the oskari.js and the wanted oskari_lang_*.js like any JavaScript file to 
an HTML page with the oskari application and call Oskari.setPreloaded(true); before calling 
Oskari.app.startApplication(); to use the compiled version of the code.

BETA) JSDoc generating with "node index.js docs" - assumes source is found under ./oskari and
tries to generate docs from ./oskari/bundles to ./docs folder. Docs not currently generated correctly, 
might be a line-encoding issue. Uses http://yui.github.com/yuidoc/

BETA) Test-runner with "node index.js test [path to appSetup file] - assumes source is found under ./oskari and
tries to setup a browser-like environment to run some Jasmine tests for Oskari classes