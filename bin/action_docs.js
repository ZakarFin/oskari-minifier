module.exports = new DocsAction();
function DocsAction() {

    var Y = require('yuidocjs');
    
    // constants copied from Y.DocParser definition 
    var REGEX_LINE_HEAD_CHAR = {
          js: /^\s*\*/,
          coffee: /^\s*#/
        };
    var REGEX_LINES = /\r\n|\n/;
    
    this.handle = function() {
        
        var options = {
            paths: [ './oskari/sources/framework',
                     './oskari/bundles/framework',
                     './oskari/bundles/sample',
                     './oskari/bundles/catalogue' ],
            outdir: './docs'
        };
        
        // NOTE: Need to override the comment parsing since Oskari has JSDuck style comments
        // YUIDoc expects method/class descriptions to start the API comment where as JSDuck
        // comments start with @method or @class and the description comes after that
        // REGEX_LINE_HEAD_CHAR/REGEX_LINES constants copied from DocParser definition 
        Y.DocParser.prototype.handlecomment = this.overrides.DocParser.handlecomment;
        
        var json = (new Y.YUIDoc(options)).run();
        var builder = new Y.DocBuilder(options, json);
        builder.compile(function() {
           console.log('Docs available at ' + options.outdir + '/index.html');
        });
    }
    
    this.overrides = {
        DocParser : {
            handlecomment: function(comment, file, line) {
                //console.log('Running override method');
                var lines = comment.split(REGEX_LINES),
                    len = lines.length, i,
                    parts, part, peek, skip,
                    results = [{tag: 'file', value: file},
                               {tag: 'line', value: line}],
                    syntaxtype = this.get('syntaxtype'),
                    lineHeadCharRegex = REGEX_LINE_HEAD_CHAR[syntaxtype],
                    hasLineHeadChar  = lines[0] && lineHeadCharRegex.test(lines[0]);
    
                // trim leading line head char(star or harp) if there are any
                if (hasLineHeadChar) {
                    for (i = 0; i < len; i++) {
                        lines[i] = lines[i].replace(lineHeadCharRegex, '');
                    }
                }
    
                // reconsitute and tokenize the comment block
                comment = this.unindent(lines.join('\n'));
                parts = comment.split(/(?:^|\n)\s*(@\w*)/);
                len = parts.length;
                var lastTag;
                for (i = 0; i < len; i++) {
                    value = '';
                    part = parts[i];
                    if (part === '') {
                        continue;
                    }
                    skip = false;
    
                    // the first token may be the description, otherwise it should be a tag
                    if (i === 0 && part.substr(0, 1) !== '@') {
                        if (part) {
                            tag = '@description';
                            value = part;
                        } else {
                            skip = true;
                        }
                    } else {
                        tag = part;
                        // lookahead for the tag value
                        peek = parts[i + 1];
                        if (peek) {
                            value = peek;
                            // ----- start override part here --------
                            var lineBreakIndex = value.indexOf('\n');
                            // if value has linebreaks, it's the description, exceptions are @param and @return
                            if(tag !== '@param' && tag !== '@return' && lineBreakIndex != -1) {
                                var desc = value.substring(lineBreakIndex + 1);
                                results.push({
                                    tag: 'description',
                                    value: desc
                                });
                                value = value.substring(0, lineBreakIndex);
                            }
                            // ----- end override part here --------
                            i++;
                        }
                    }
    
                    if (!skip && tag) {
                        results.push({
                            tag: tag.substr(1).toLowerCase(),
                            value: value
                        });
                    }
                }
    
                return results;
            }
        }
    }
}