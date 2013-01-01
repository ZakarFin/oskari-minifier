module.exports = new TestAction();
function TestAction() {
    
    var jsdom = require("jsdom");
        
    
    /*
    //fake browser window
    global.window = require("jsdom")
                    .jsdom()
                    .createWindow();
    global.jQuery = require("jquery");
*/
    //Test framework
    var jasmine=require('jasmine-node');
    for(var key in jasmine) {
      global[key] = jasmine[key];
    }
    var vm = require("vm");
    var fs = require("fs");
    var parser = require('./parser');
    
    var dummyHtmlFragment = fs.readFileSync('./bin/testPage.html').toString();
    var oskariLoader = fs.readFileSync('./oskari/bundles/bundle.js').toString();
    var jQuerySrc = fs.readFileSync('./oskari/libraries/jquery/jquery-1.7.1.min.js').toString();
    
    var logFile = 'log.txt';
    
    this.handle = function(processedAppSetup) {
        var me = this;
        
        
        jsdom.env({
          html: dummyHtmlFragment,
          //scripts: ["http://code.jquery.com/jquery.js"],
          src: [oskariLoader, jQuerySrc],
          done: function (errors, window) {
            me.startupOskari(window, processedAppSetup);
          }
        });
    }
    
    this.startupOskari = function(window, processedAppSetup) {
        var me = this;
        //vm.runInThisContext(oskariLoader, logFile);
        // loop appsetup files
        /*
        vm.runInContext(appSetupFiles, window, logFile)
        */
        //var jQuery = window.jQuery;
        //var Oskari = window.Oskari;
        //console.log(Oskari);
        
            //window : window,
            //jQuery : window.jQuery,
            //Oskari : window.Oskari
        var env = {
        };
        for(var key in window) {
            env[key] = window[key];
        }
        
        var context = vm.createContext(env);
        
        for (var j = 0; j < processedAppSetup.length; ++j) {
            var array = parser.getFilesForComponent(processedAppSetup[j], 'javascript');
            for (var i = 0; i < array.length; ++i) {
                var bundleCode = fs.readFileSync(array[i]).toString();
                console.log('Running ' + array[i] + ' from ' + processedAppSetup[j].name);
                vm.runInContext(bundleCode, context, logFile);
                //vm.runInThisContext(bundleCode, logFile);
            }
            var langfiles = {};
            var deps = processedAppSetup[j].dependencies;
            for (var i = 0; i < deps.length; ++i) {
                for (var lang in deps[i].locales) {
                    if(lang == 'all' || lang == 'fi') {
                        console.log(deps[i].locales[lang][0]);
                        var localization = fs.readFileSync(deps[i].locales[lang][0]).toString();
                        vm.runInContext(localization, context, logFile);
                    }
                }
            }
        }
        
        
        for(var key in context) {
            global[key] = context[key];
        }
        
        // bypass timeouts as they break jsdom
        var setTimeoutOriginalImpl = global.setTimeout;
        global.setTimeout = function(cb, time) {
            console.log('Mock timeout with time:' + time);
            cb();
/*            if(time == 0) {
                cb();
            }
            else {
                setTimeoutOriginalImpl(cb, time);
            }
            */
        }
        // TODO: maybe reinstate the original setTimeout implementation after startup?
        
        // FIXME: do this better than this
        var appSetup = {
            startupSequence : processedAppSetup[0].originalData
        };
        var appConfig = fs.readFileSync('./oskari/applications/sample/mythird/config.json').toString();
        
        var configData = JSON.parse(appConfig);
        var app = Oskari.app;
        Oskari.setPreloaded(true);
        //Oskari.setDebugMode(true);
        
        Oskari.setLang('fi');
        app.setApplicationSetup(appSetup);
        app.setConfiguration(configData);
        app.startApplication(function(startupInfos) {
            // all bundles have been started
            console.log('started');
            me.runTests();
        });
        
    }
    this.runTests = function() {
        console.log('Running tests');
        console.log(Oskari.$('sandbox'));
        
        /*
        jasmine.executeSpecsInFolder(__dirname + '/specs', function(runner, log){  
            process.exit(runner.results().failedCount?1:0);
        }, true, true);
        */
    }
}