var arguments = process.argv.splice(2);
if (arguments.length < 2) {
    console.log('Usage: node index.js [compile | validate] <path to appsetup.json>');
    return;
} 
var actionHandler = require('./bin/action_' + arguments[0]);
if(!actionHandler || !actionHandler.handle) {
    console.log('Invalid action, no handler for action ' + arguments[0]);
    return;
}

var parser = require('./bin/parser');

var appSetupFile = arguments[1]; 
var processedAppSetup = parser.getComponents(appSetupFile);
actionHandler.handle(processedAppSetup);

var unknownfiles = [];
for (var j = 0; j < processedAppSetup.length; ++j) {
    unknownfiles = unknownfiles.concat(parser.getFilesForComponent(processedAppSetup[j], 'unknown'));
}
if(unknownfiles.length != 0) {
    console.log('Appsetup referenced types of files that couldn\'t be handled: ' + unknownfiles);
}
