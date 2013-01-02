var arguments = process.argv.splice(2);
if (arguments.length < 1) {
    console.log('Usage: node index.js [compile | validate | test | docs] <path to appsetup.json>');
    return;
} 
var actionHandler = require('./bin/action_' + arguments[0]);
if(!actionHandler || !actionHandler.handle) {
    console.log('Invalid action, no handler for action ' + arguments[0]);
    return;
}
if(arguments[0] == 'docs') {
    // docs dont use appsetup
    actionHandler.handle();
    return;
}
else if(arguments.length < 1) {
    console.log('Usage: node index.js [compile | validate | test | docs] <path to appsetup.json>');
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
};