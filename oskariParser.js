var fs = require('fs');
var path = require('path');

module.exports = OskariParser;
function OskariParser() {

    this.getComponents = function(data, basePath) {
        var bundleSequence = [];
        for (var i = 0; i < data.length; ++i) {
            var bundle = data[i];
            var component = {
                name : bundle.bundlename,
                dependencies : []
            };
            bundleSequence.push(component);
            var bundleDeps = bundle.metadata['Import-Bundle'];
            for (var id in bundleDeps) {
                // "openlayers-default-theme" : { "bundlePath" : "../../../packages/openlayers/bundle/" },
                var bundlePath = bundleDeps[id].bundlePath;
                var normalizedPath = path.resolve(basePath, bundlePath);
                component.dependencies.push(this.handleBundle(id, normalizedPath));
                //validateJS(content, wholePath);
            }
        }
        return bundleSequence;
    }
    this.handleBundle = function(id, basepath) {
        var bundleDef = {
            id : id,
            javascript : [],
            css : [],
            locales : {},
            unknown : []
        };

        var bundlePath = basepath + "/" + id + "/bundle.js";
        var relativePath = path.dirname(bundlePath);
        bundleDef.javascript.push(bundlePath);

        var content = fs.readFileSync(bundlePath, 'utf8');
        var scripts = this.findArray(content, 'scripts', bundlePath);
        for (var j = 0; j < scripts.length; ++j) {
            var implFile = scripts[j];
            var normalizedImplPath = path.resolve(relativePath, implFile.src);
            if (implFile.type == "text/javascript") {
                bundleDef.javascript.push(normalizedImplPath);
                //files.push(normalizedImplPath);
                //var implContent = fs.readFileSync(normalizedImplPath,'utf8');
                //validateJS(implContent, normalizedImplPath, wholePath);
            } else if (implFile.type == "text/css") {
                bundleDef.css.push(normalizedImplPath);
            } else {
                bundleDef.unknown.push({
                    type : implFile.type,
                    file : normalizedImplPath
                });
                // log('Unknown file type:' + implFile.type + ' for file ' + normalizedImplPath);
            }
        }
        var locales = this.findArray(content, 'locales', bundlePath);
        for (var j = 0; j < locales.length; ++j) {
            var locFile = locales[j];
            var lang = locFile.lang;
            var normalizedImplPath = path.resolve(relativePath, locFile.src);
            if (!lang) {
                if (!bundleDef.locales.all) {
                    bundleDef.locales.all = [];
                }
                bundleDef.locales.all.push(normalizedImplPath);
            } else {
                if (!bundleDef.locales[lang]) {
                    bundleDef.locales[lang] = [];
                }
                bundleDef.locales[lang].push(normalizedImplPath);
            }
        }
        return bundleDef;
    }

    this.findArray = function(content, arrayName, pathForLogging) {

        var stripped = this.removeBlockComments(content);
        var validJSON = this.removeSingleLineComments(stripped);

        var indexOf = validJSON.indexOf(arrayName);
        if (indexOf === -1) {
            return [];
        }
        var arrayJSON = validJSON.substring(indexOf);
        indexOf = arrayJSON.indexOf('[');
        if (indexOf === -1) {
            return [];
        }
        arrayJSON = arrayJSON.substring(indexOf);
        indexOf = arrayJSON.indexOf(']');
        if (indexOf === -1) {
            return [];
        }
        arrayJSON = arrayJSON.substring(0, indexOf + 1);

        try {
            return JSON.parse(arrayJSON);
        } catch(err) {
            var msg = 'Error parsing JSON array "' + arrayName + '" from file:' + pathForLogging + '\nMessage: ' + err;
            throw msg;
        }
    }

    this.removeSingleLineComments = function(content) {
        var lines = content.split("\n");
        var value = '';
        for (var i = 0; i < lines.length; ++i) {
            var uncommented = lines[i].split('//');
            value = value + uncommented[0];
        }
        return value;
    }

    this.removeBlockComments = function(content) {

        var indexOF = content.indexOf("/*");
        if (indexOF == -1) {
            return content;
        }
        var scripts = content.substring(indexOF);
        var endIndex = scripts.indexOf('*/');
        var value = content.substring(0, indexOF);
        value = value + scripts.substring(endIndex + 2);
        return this.removeBlockComments(value);
    }

    this.getFilesForComponent = function(component, arrayName) {
        var files = [];
        for (var i = 0; i < component.dependencies.length; ++i) {
            var array = component.dependencies[i][arrayName];
            files = files.concat(array);
        }
        return files;
    }
} 