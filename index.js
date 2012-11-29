var arguments = process.argv.splice(2);
var UglifyJS = require('uglify-js');
var cssPacker = require('uglifycss') ;

//var oskariLoader = require('./oskari/bundles/bundle');
var fs = require('fs');
var path = require('path');
var files = [];
var cssfiles = [];
var logMessages = [];
var appSetupFile = './oskari/applications/sample/myfirst/appsetup.json'; 
if (arguments.length > 0) {
    appSetupFile = arguments[0];
} 
readFile(appSetupFile, function(data) {
    var parsed = JSON.parse(data);
    var relativePath = path.dirname(appSetupFile);
    processAppSetup(parsed.startupSequence, relativePath);
});

function readFile(filename, callback, errorHandler) {
    fs.readFile(filename, function read(err, data) {
        if (err) {
            if(errorHandler) {
                errorHandler(err);
            }
            else {
                console.log(err);
            }
            return;
        }
        callback(data);
    });
}
function processAppSetup(data, basePath) {
    var bundleStore = {};
    var bundleSequence = [];
    for (var i = 0; i < data.length; ++i) {
        var bundle = data[i];
        if(!bundleStore[bundle.bundlename]) {
            bundleStore[bundle.bundlename] = {};
            bundleStore[bundle.bundlename].files = [];
            bundleSequence.push(bundle.bundlename);
        } 
        var bundleDeps = bundle.metadata['Import-Bundle'];
        for(var id in bundleDeps) {
            // "openlayers-default-theme" : { "bundlePath" : "../../../packages/openlayers/bundle/" },
            var bundlePath = bundleDeps[id].bundlePath;
            var normalizedPath = path.resolve(basePath, bundlePath);
            var wholePath = normalizedPath + "/" + id + "/bundle.js";
            files.push(wholePath);
            var content = fs.readFileSync(wholePath,'utf8');
            var obj = {
                name : wholePath,
                content : content
            };
            //validateJS(content, wholePath);
            var relativePath = path.dirname(wholePath);
            var scripts = [];
            try {
                scripts = findArray(content, 'scripts');
            }
            catch(err) {
                log('Error parsing JSON array "scripts" from file:' + wholePath);
            } 
            for (var j = 0; j < scripts.length; ++j) {
                var implFile = scripts[j];
                var normalizedImplPath = path.resolve(relativePath, implFile.src);
                if(implFile.type == "text/javascript") {
                    files.push(normalizedImplPath);
                    var implContent = fs.readFileSync(normalizedImplPath,'utf8');
                    validateJS(implContent, normalizedImplPath, wholePath);
                }
                else if(implFile.type == "text/css"){
                    cssfiles.push(normalizedImplPath);
                }
                else {
                    log('Unknown file type:' + implFile.type + ' for file ' + normalizedImplPath);
                }
            }
               
            bundleStore[bundle.bundlename].files.push(obj);
        }
    }
    minifyJS(files, 'oskari.js');
    minifyCSS(cssfiles, 'oskari.css');
    //console.log(bundleStore);
    log('Completed!', true);
}
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

function findArray(content, arrayName) {
    
    var indexOF = content.indexOf(arrayName);
    var scripts = content.substring(indexOF);
    scripts = scripts.substring(scripts.indexOf('['));
    scripts = scripts.substring(0, scripts.indexOf(']') + 1);
    var stripped = removeBlockComments(scripts);
    var validJSON = removeSingleLineComments(stripped);
    return JSON.parse(validJSON); 
}
function removeSingleLineComments(content) {
    var lines = content.split("\n");
    var value = '';
    for(var i = 0; i < lines.length; ++i) {
        var uncommented = lines[i].split('//');
        value = value + uncommented[0];
    }
    return value;
}
function removeBlockComments(content) {
    
    var indexOF = content.indexOf("/*");
    if(indexOF == -1) {
        return content;
    }
    var scripts = content.substring(indexOF);
    var endIndex = scripts.indexOf('*/');
    var value = content.substring(0, indexOF);
    value = value + scripts.substring(endIndex + 2);
    return removeBlockComments(value);
}

function resolveImplementationFiles(fileslist) {
    if(fileslist.length != 0) {
        var file = fileslist.splice(0, 1);
        readFile(file, function(data) {
            var relativePath = path.dirname(appSetupFile);
            processAppSetup(parsed.startupSequence, relativePath);
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
    
    var out = fs.createWriteStream(outputFile);
    out.write(result.code);
    out.destroySoon();
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
