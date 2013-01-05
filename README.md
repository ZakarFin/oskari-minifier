oskari-minifier
===============

NodeJS module for interpreting nls-oskari projects startupsequences and minifying the 
set of files defined in it to a compiled JS files and a CSS file or validating the files.

1) Install dependencies with "npm -d install".

2) Run with "node index.js [command]
 Where command is one of:
 * compile [path to appSetup file]
 * validate [path to appSetup file]
 * test [path to appSetup file] [path to appConfig file]
 * docs

Compile
========
 Writes files to the 'compiled' directory:
* oskari.js = compiled source based on appsetup
* oskari.css = compiled css based on appsetup
* oskari_lang_all.js = localization files that have no language defined based on appsetup
* oskari_lang_[language].js = localization files that have a language defined based on appsetup

You can include the oskari.js and the wanted oskari_lang_*.js like any JavaScript file to 
an HTML page with the oskari application and call Oskari.setPreloaded(true); before calling 
Oskari.app.startApplication(); to use the compiled version of the code.

Example:
1) Clone Oskari under the minifier: git clone https://github.com/nls-oskari/oskari.git
 -> You have an oskari folder under the oskari-minifier
2) Run "node index.js compile oskari/applications/sample/mythird/appsetup.json"

Validate
========
 Writes files to the 'validation' directory:
* [bundle id].txt = Validation messages for bundle

Test
========
 Reads the appSetup, setups a browser-like environment, starts an Oskari application on it 
 and runs any tests under 'specs' directory that match bundles in 
the appSetup. The directory structure is './specs/framework/[bundleid]/' with free structure after.
Tests are run with https://github.com/mhevery/jasmine-node/.
 Assumes Oskari-code is under ./oskari/ directory.

 Example:
 Run "node index.js test oskari/applications/sample/mythird/appsetup.json oskari/applications/sample/mythird/config.json"

Docs
========
 Generates YUIDoc files to the 'docs' directory.
 Assumes code to document is under ./oskari/ directory.
 Uses http://yui.github.com/yuidoc/ with some overriding on comment parsing.

