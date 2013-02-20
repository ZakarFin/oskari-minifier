module.exports = new CompileCSSAction();
function CompileCSSAction() {

    var fs = require('fs');
    var path = require('path');
    var parser = require('./parser');
    var minifier = require('./minifier');
    var gm = require('gm');
    var images = [];
    
    var image = gm.subClass({ imageMagick: true });
    var compiledDir = './compiled/';
    var compiledImage = 'comp.png';
    var placeholderStart = '---PLACEHOLDERIMAGE_';
    var placeholderEnd = '---';
    //image("img.png").autoOrient().write('/path', callback);


    this.handle = function(processedAppSetup) {

        if (!fs.existsSync(compiledDir)) {
            fs.mkdirSync(compiledDir);
        }

        var cssContents = {};
        for (var j = 0; j < processedAppSetup.length; ++j) {
            var cssfiles = parser.getFilesForComponent(processedAppSetup[j], 'css');
            var contents = '';
            
            for (var i = 0; i < cssfiles.length; ++i) {
                if (!fs.existsSync(cssfiles[i])) {
                    var msg = 'Couldnt locate ' + cssfiles[i]; 
                    throw msg;
                }
                var content = fs.readFileSync(cssfiles[i], 'utf8');
                content = this.processForImages(content, processedAppSetup[j].name, cssfiles[i]);
                contents = contents + '\n' + content;
            }
            cssContents[processedAppSetup[j].name] = contents;
        }
        var me = this;
        var allCSS = '';
        var constructImageCallback = function(){
            var imgMap = {};
            for (var i = 0; i < images.length; i++) {
                var img = images[i];
                var newCss = me.getCSSForImage(img);
                img.css = newCss;
                imgMap[img.placeholder] = img;
            } 
            for(var bundleid in cssContents) {
                var css = cssContents[bundleid];
                cssContents[bundleid] = me.replacePlaceholders(css, imgMap);
                allCSS = allCSS + cssContents[bundleid] + '\n';
            }
            minifier.minifyCSS(allCSS, compiledDir + 'oskari.css');
        };
        var sizeCallback = function(index, cb) {
            var nextIndex = index + 1; 
            if(nextIndex === images.length) {
                // done
                me.constructImage(constructImageCallback);
            }
            else {
                me.populateImageSize(nextIndex, sizeCallback);
            }
            
        };
        if(images.length > 0) {
            this.populateImageSize(0, sizeCallback);
        }
        
        // TODO: parse contents and resolve the imagepaths
        // create a compiled image with http://aheckmann.github.com/gm/
        //var packed = cssPacker.processString(value);
        //minifier.minifyCSS(cssfiles, compiledDir + 'oskari.css');
    }
    
    this.processForImages = function(content, bundleid, file) {
        var lines = content.split("\n");
        var value = '';
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            value = value + this.breakDownCSSLine(line, bundleid, file) + '\n';
        }
        return value;
    } 
    this.replacePlaceholders = function(css, imageMap) {
            
        var placeHolderIndex = css.indexOf(placeholderStart);
        if(placeHolderIndex === -1) {
            return css;
        }
        else {
            var placeHolderEndIndex = css.indexOf(placeholderEnd, placeHolderIndex + placeholderStart.length);
            var placeHolder = css.substring(placeHolderIndex, placeHolderEndIndex + placeholderEnd.length );
            css = css.replace(placeHolder, imageMap[placeHolder].css);
            return this.replacePlaceholders(css, imageMap);
        }
    }
    this.breakDownCSSLine = function(lineParam, bundleid, file) {
        var modContent = '';
        var definitions = lineParam.split(';');
        for (var i = 0; i < definitions.length; ++i) {
            var line = definitions[i];
            var imageUrlIndex = line.indexOf('url');
            if(imageUrlIndex != -1) {
                console.log('image found on bundle ' + bundleid + 
                ' in file' + file + ' - line: ' + line.trim());
                var imageUrlEndIndex = line.indexOf(')', imageUrlIndex);
                var url = line.substring(imageUrlIndex + 4, imageUrlEndIndex);
                // cleanup the url
                url = url.replace(/[\'\"\(\)\s]/g, "");
    //trimLeft = /^[\s\xA0]+/;
    //trimRight = /[\s\xA0]+$/;
                console.log('Got clean url ' + url);
                var normPath = '';
                if(url.charAt(0) === '/') {
                    url = url.replace(/Oskari/g, "oskari");
                    normPath = path.resolve(".", '.' + url);
                }
                else {
                    var basePath = path.dirname(file);
                    normPath = path.resolve(basePath, url);
                }
                
                console.log('Got image path ' + normPath + '\n--------------------');
                if (!fs.existsSync(normPath)) {
                    console.log('Referenced image not found on disk! ' + normPath);
                }
                else {
                    var defStartIndex = line.indexOf('background');
                    var def = {
                        placeholder : placeholderStart + images.length + placeholderEnd,
                        css: line.substring(defStartIndex),
                        file : normPath
                    };
                    images.push(def);
                    // write a placeholder that we will replace when we have determined the image sizes
                    line = line.replace(def.css, def.placeholder);
                } 
            }
            line = line.trim();
            var lastChar = line.charAt(line.length -1); 
            
            if(definitions.length > 1 && 
                line.indexOf('}') === -1 && 
                line != '' && 
                lastChar != '{' && 
                lastChar != '/') {
                line = line + ';';
                console.log('added ; for line ' + line.trim());
            }
            else {
                //console.log('skipped ; for line ' + line.trim());
            }
            modContent = modContent + line + '\n';
        }
        return modContent;
    }
    
    this.getCSSForImage = function(img) {
        // TODO: handle images with repeat differently, need to parse whole 
        // css block instead of just lines with url defs to correctly detect repeat
        var repeat = 'no-repeat !important';
        var scroll;
        var color;  
        var syntaxIndex = 'background'.length + 1;
        if(img.css.charAt(syntaxIndex) === '-') {
            // only replace background-image
            return 'background-image: url(\'' + compiledImage + '\') !important; ' +
                    'background-repeat: ' + repeat + ';' + 
                    'background-position: 0px ' + -img.y +  'px !important;';
        }
        else {
            // need to parse full background def
            var index = img.css.indexOf(':');
            var defStr = img.css.substring(index + 1);
            var defs = defStr.split(" "); 
            for(var i=0; i < defs.length; ++i) {
                if( i === 0 && defs[0].indexOf('url') === -1){
                    // color
                    color = defs[0];
                    //background-color: transparent;
                    continue;  
                }
                else if(defs[i].indexOf('repeat') !== -1) {
                    repeat = defs[i];
                }
                else if(defs[i].indexOf('scroll') !== -1 
                        ||  defs[i].indexOf('fixed') !== -1) {
                    scroll = defs[i];
                }
                else {
                    // position
                }
            }
            var value = 'background-image: url(\'' + compiledImage + '\') !important; ' +
                    'background-repeat: ' + repeat + '; ' + 
                    'background-position: 0px ' + -img.y +  'px !important; ';
            if(color) {
                value = value + 'background-color: ' + color + '; ';
            }
            if(scroll) {
                value = value + 'background-attachment: ' + scroll + '; ';
            }
            return value
            
    // background: url('/Oskari/resources/framework/bundle/divmanazer/images/tab_bg.png') repeat-x scroll center bottom;
    /*
    http://www.w3schools.com/css/css_background.asp
    background-color: transparent;
    background-image:url('img_tree.png');
    background-repeat:no-repeat;
    background-attachment: scroll;
    background-position:right top;
    */
        }
        
    //background-image: url('/Oskari/applications/paikkatietoikkuna.fi/full-map/icons/icons.png') !important;
    // background-repeat: no-repeat !important;
    //background-position: -46px 0px !important;
    }
    
    this.populateImageSize = function(index, cb) {
        var img = images[index];
        
        var me = this;

        image(img.file).size(function(err, size) {
            if(err) {
                console.log(img.file + ' image NOT FOUND');
            }
            else {
                img.width = size.width;
                img.height = size.height;
            }
            cb(index);
         });

    }
    this.constructImage = function(callback) {
        var compImage = image(images[0].file);
        var y = 0; 
        images[0].y = y;
        y += images[0].height;
        
        for (var i = 1; i < images.length; i++) {
            if(!images[i].height) {
                continue;
            }
            images[i].y=y;
            compImage.append(images[i].file);
            y += images[i].height;
        }
        
        // finally write out the file asynchronously
        compImage.write(compiledDir + compiledImage, function (err) {
          if (!err) console.log('Done!');
          else console.log('Error writing compiled image: ' + err);
          callback();
        });
    }
}