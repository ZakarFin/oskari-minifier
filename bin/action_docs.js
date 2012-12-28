module.exports = new DocsAction();
function DocsAction() {

    var Y = require('yuidocjs');
    
    this.handle = function(processedAppSetup) {
        
        var options = {
            paths: [ './oskari/bundles' ],
            outdir: './docs'
        };
        var json = (new Y.YUIDoc(options)).run();
        var builder = new Y.DocBuilder(options, json);
        builder.compile(function() {
           console.log('Docs available at ' + options.outdir + '/index.html');
        });
    }
}