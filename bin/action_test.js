module.exports = new TestAction();
function TestAction() {

    var jsdom = require("jsdom");

    var jasmine = require('jasmine-node');
    var vm = require("vm");
    var fs = require("fs");
    var parser = require('./parser');

    var dummyHtmlFragment = fs.readFileSync('./bin/testPage.html').toString();
    var oskariLoader = fs.readFileSync('./oskari/bundles/bundle.js').toString();
    var jQuerySrc = fs.readFileSync('./oskari/libraries/jquery/jquery-1.7.1.min.js').toString();

    var logFile = 'log.txt';

    this.handle = function(processedAppSetup, args) {
        var me = this;
        if(args.length == 0) {
            console.log('Please provide config.json as parameter');
            return;
        }
        this.appConfig = args[0]

        jsdom.env({
            html : dummyHtmlFragment,
            //scripts: ["http://code.jquery.com/jquery.js"],
            src : [oskariLoader, jQuerySrc],
            done : function(errors, window) {
                me.startupOskari(window, processedAppSetup);
            }
        });
    }

    this.startupOskari = function(window, processedAppSetup) {
        var me = this;
        var env = {};
        for (var key in window) {
            env[key] = window[key];
        }

        var context = vm.createContext(env);

        for (var j = 0; j < processedAppSetup.length; ++j) {
            var array = parser.getFilesForComponent(processedAppSetup[j], 'javascript');
            for (var i = 0; i < array.length; ++i) {
                var bundleCode = fs.readFileSync(array[i]).toString();
                console.log('Running ' + array[i] + ' from ' + processedAppSetup[j].name);
                vm.runInContext(bundleCode, context);
            }
            var langfiles = {};
            var deps = processedAppSetup[j].dependencies;
            for (var i = 0; i < deps.length; ++i) {
                for (var lang in deps[i].locales) {
                    for(var k = 0; k < deps[i].locales[lang].length; ++k) {
                        var localization = fs.readFileSync(deps[i].locales[lang][k]).toString();
                        vm.runInContext(localization, context);   
                    }
                }
            }
        }

        for (var key in context) {
            global[key] = context[key];
        }

        // bypass timeouts as they break jsdom
        var setTimeoutOriginalImpl = global.setTimeout;
        global.setTimeout = function(cb, time) {
            //console.log('Mock timeout with time:' + time);
            cb();
        }
        // TODO: maybe reinstate the original setTimeout implementation after startup?

        // FIXME: do this better than this
        var appSetup = {
            startupSequence : processedAppSetup[0].originalData
        };
        // './oskari/applications/sample/mythird/config.json'
        var appConfig = fs.readFileSync(this.appConfig).toString();

        var configData = JSON.parse(appConfig);
        var app = Oskari.app;
        Oskari.setPreloaded(true);

        Oskari.setLang('fi');
        app.setApplicationSetup(appSetup);
        app.setConfiguration(configData);
        app.startApplication(function(startupInfos) {
            // all bundles have been started
            console.log('started');
            me.runTestsForApplication(processedAppSetup);
        });

    }
    this.runTestsForApplication = function(processedAppSetup) {
        console.log('Running tests');

        for (var key in jasmine) {
            global[key] = jasmine[key];
        }
        var me = this;
        var run = function(index) {
            me.runTestsForBundle('framework', processedAppSetup[index].name, function(bundleid, runner) {
                console.log('Completed tests for ' + bundleid);
                if(runner) {
                    console.log('Failcount: ' + runner.results().failedCount);
                }
                if(index < processedAppSetup.length - 1) {
                    run(index + 1);
                }
                else {
                    console.log('Finished tests')
                }
            });
        }
        run(0);
    }
    
    this.runTestsForBundle = function(namespace, bundleid, callback) {
        console.log('Starting tests for ' + bundleid);
        
        var junitreport = {
            report : true,
            savePath : './testreports/' + namespace + '/' + bundleid + '/',
            useDotNotation : true,
            consolidate : true
        };
        var options = {
            specFolder : './specs/' + namespace + '/' + bundleid + '/',
            onComplete : function(runner) {
                callback(bundleid, runner);
            },
            isVerbose : true,
            showColors : true,
            //teamcity: teamcity,
            //useRequireJS: useRequireJs,
            //regExpSpec: regExpSpec,
            junitreport : junitreport
        };
        
        if(fs.existsSync(options.specFolder)) {
            // ensure report path is ok
            if(!fs.existsSync('./testreports/')) {
                fs.mkdirSync('./testreports/', "0755");
            }
            if(!fs.existsSync('./testreports/' + namespace+ '/')) {
                fs.mkdirSync('./testreports/' + namespace+ '/', "0755");
            }
            if(!fs.existsSync('./testreports/' + namespace+ '/' + bundleid + '/')) {
                fs.mkdirSync('./testreports/' + namespace+ '/' + bundleid + '/', "0755");
            }
            // https://github.com/mhevery/jasmine-node/
            jasmine.executeSpecsInFolder(options);
        }
        else {
            callback(bundleid, false);
        }
    }
}