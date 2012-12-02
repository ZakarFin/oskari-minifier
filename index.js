var arguments = process.argv.splice(2);
var UglifyJS = require('uglify-js');
var cssPacker = require('uglifycss') ;

var fs = require('fs');
var path = require('path');
var oskariParser = require('./oskariParser');
var logMessages = [];
var appSetupFile = './oskari/applications/sample/myfirst/appsetup.json'; 
if (arguments.length > 0) {
    appSetupFile = arguments[0];
} 
var appSetupData = fs.readFileSync(appSetupFile,'utf8');
var parsed = JSON.parse(appSetupData);
var relativePath = path.dirname(appSetupFile);
var parser = new oskariParser();
var processedAppSetup = parser.getComponents(parsed.startupSequence, relativePath);

var files = [];
for (var j = 0; j < processedAppSetup.length; ++j) {
    var array = parser.getFilesForComponent(processedAppSetup[j], 'javascript');
    files = files.concat(array);
}
minifyJS(files, 'oskari.js');

var langfiles = {};
for (var j = 0; j < processedAppSetup.length; ++j) {
    var deps = processedAppSetup[j].dependencies;
    for (var i = 0; i < deps.length; ++i) {
        for(var lang in deps[i].locales) {
            if(!langfiles[lang]) {
                langfiles[lang] = [];
            }
            langfiles[lang] = langfiles[lang].concat(deps[i].locales[lang]);
        }
    }
}
//console.log(langfiles);
minifyLocalization(langfiles);

var cssfiles = [];
for (var j = 0; j < processedAppSetup.length; ++j) {
    cssfiles = cssfiles.concat(parser.getFilesForComponent(processedAppSetup[j], 'css'));
}
minifyCSS(cssfiles, 'oskari.css');
//console.log(bundleStore);
log('Completed!', true);



function log(message, writeToFile) {
    logMessages.push(message);
    if(writeToFile) {
        
        var value = '';
        for(var i = 0; i < logMessages.length; ++i) {
            value = value + logMessages[i] + '\n';
        }
        fs.writeFile('oskari.log', value, function(err) {
            if(err) {
                console.log('Error writing log to file: ' + err);
            } 
        }); 
    }
}


function minifyCSS(files, outputFile) {
    
    var value = '';
    for (var i = 0; i < files.length; ++i) {
        if(fs.existsSync(files[i])) {
            var content = fs.readFileSync(files[i],'utf8');
            value = value + '\n' + content; 
        }
        else {
            log('Couldnt locate ' + files[i]);
        }
    }
    var packed = cssPacker.processString(value); //, params.options));

    fs.writeFile(outputFile, packed, function(err) {
        if(err) {
            log('Error writing packed CSS: ' + err);
        } 
    }); 
    
}

function minifyLocalization(langfiles) {
    for(var id in langfiles) {
        //console.log('Minifying loc:' + id + '/' + langfiles[id]);
        minifyJS(langfiles[id], 'oskari_lang_' + id + '.js');
    }
}

function minifyJS(files, outputFile) {
    var okFiles = [];
    
    for (var i = 0; i < files.length; ++i) {
        if(fs.existsSync(files[i])) {
            okFiles.push(files[i]);
        }
        else {
            log('Couldnt locate ' + files[i]);
        }
    }

    var result = UglifyJS.minify(okFiles, {
        //outSourceMap : "out.js.map",
        warnings : true,
        compress : true
    });
    fs.writeFileSync(outputFile, result.code, 'utf8');
}

function validateJS(code, file, bundleFile) {
    var JSHint = require('jshint');
    JSHint.JSHINT(code);
    var nErrors = JSHint.JSHINT.errors;
    if(nErrors.length > 0) {
        log('Validation errors!');
        if(bundleFile) {
            log('   in files linked by: ' + bundleFile);
        }
        log('Found ' + nErrors.length + ' lint errors on ' + file + '.\n');
    }
    // JSON.stringify()
    for (var i = 0; i < nErrors.length; ++i) {
        if(!nErrors[i]) {
            log('Null error? ' + nErrors[i]);
        }
        else {
            log('Error (line ' + nErrors[i].line + ' char ' + nErrors[i].character + '): ' + nErrors[i].reason + ' ' + nErrors[i].id);
            log('       ' + nErrors[i].evidence + '\n');
        }
    }
}
