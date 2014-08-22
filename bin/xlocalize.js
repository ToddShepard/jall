#!/usr/bin/env node

// Load required modules
var fs = require('fs');
var path = require('path');
var commander = require('commander');

// Use localize for internal localizations
var localize = new require('../lib/localize')(__dirname);
localize.throwOnMissingTranslation(false);
var translate = localize.translate;

function list(str) {
    return str.split(',');
}

function log(message) {
    if (commander.verbose) {
        console.log(message);
    }
}

commander
    .version(require('../package.json').version)
    .option('-l, --language <lang>', 'Set the default language for the translations.json file(s) (default: en)', 'en')
    .option('-r, --recursive', 'Set xlocalize to generate translations.json files recursively (default: true)', true)
    .option('-R, --no-recursive', 'Set xlocalize to generate a translations.json file for the current directory')
    .option('-e, --extensions <exts>', 'Set the file extensions to include for translation (default: html,js)', list, ['html', 'js'])
    .option('-t, --translate-to <langs>', 'Set the languages to translate to (comma separated)', list, [])
    .option('-o, --output-dir <dir>', 'Set the output directory for the translations.json file(s) (default: current dir)', process.cwd())
    .option('-v, --verbose', 'Verbose output (default: false)', false)
    .parse(process.argv);

// Set internal localize object to use the user's default language
localize.setLocale(commander.language);

// ## The *mergeObjs* function
// is a helper function that clones the value of various object into a new one.
// This simplistic one is fast, but assumes no recursive objects to merge.
function mergeObjs() {
    var outObj = {};
    for(var i in arguments) {
        if(arguments[i] instanceof Object) {
            /* jshint forin: false */
            for(var j in arguments[i]) {
                // Does not check for collisions, newer object
                // definitions clobber old definitions
                outObj[j] = arguments[i][j];
            }
        }
    }
    return outObj;
}

// ## The *processFile* function
// extracts all translatable pieces of a source file into the dirJSON object,
// unless already there.
function processFile(filename, dirJSON) {
    // Check that we don't localize ourselves
    if (filename == __filename) {
        log('Skipping ' + filename);
        return;
    }
    log('Processing ' + filename + '...');
    // Hacky, hacky RegExp parsing right now; replace with something better
    var fileContents = fs.readFileSync(filename, "utf8");
    var translatables = fileContents.match(/translate\s*\(.*\)/g);
    //console.log(translatables);
    if(translatables) {
        /* jshint loopfunc: true */
        for(var i = 0; i < translatables.length; i++) {
            console.log(funParse(translatables[i], 'translate'));
            if(/^translate\s*\(\s*['"](.*)['"]$/.test(translatables[i])) { // A string-looking thing
                if(!dirJSON[RegExp.$1]) { // Does not yet exist
                    dirJSON[RegExp.$1] = {};
                }
                commander.translateTo.forEach(function(lang) {
                    if(!dirJSON[RegExp.$1][lang]) { // No translation, yet
                        dirJSON[RegExp.$1][lang] = translate("MISSING TRANSLATION");
                    }
                });
            } else {
                var translateMessage = translate("FOUND VARIABLE INPUT: $[1]", translatables[i]);
                dirJSON[translateMessage] = {};
                commander.translateTo.forEach(function(lang) {
                    dirJSON[translateMessage][lang] = translate("MISSING TRANSLATION");
                });
            }
        }
    }
}

function funParse(string, fun) {
    const states = {
        INIT        : 0,
        FUNC_FOUND  : 1,
        FUNC_START  : 2,
        FUNC_ARGS   : 3,
        FUNC_STR    : 4
    }
    var state = states.INIT;
    var content = [];
    var buffer = '';
    start = string.indexOf(fun);
    if (start == -1)
        return content;
    for (var i = start; i < string.length; i++) {
        c = string[i];
        switch (state) {
            case states.INIT:
                if (c == ' ' || c == '\t') {
                    buffer = '';
                    break;
                } else {
                    buffer += c;
                }
                if (buffer == fun){
                    buffer = '';
                    state = states.FUNC_FOUND;
                }
                break;
            case states.FUNC_FOUND:
                if (c == '(') {
                    state = states.FUNC_START;
                } else if (c == ' ' || c == '\t') {
                    break;
                } else {
                    state = states.INIT;
                }
                break;
            case states.FUNC_START:
                if (c == '"' || c == '\'') {
                    state = states.FUNC_STR;
                } else if (c != ' ' && c != '\t') {
                    state = states.INIT; // First argument must be a string
                }
                break;
            case states.FUNC_STR:
                if (c == '"' || c == '\'') {
                    content.push(buffer);
                    buffer = '';
                    state = states.FUNC_ARGS;
                } else if (c == '\\') {
                    i++;
                } else {
                    buffer += c;
                }
                break;
            case states.FUNC_ARGS:
                if (c == ')') {
                    state = states.INIT;
                    buffer = '';
                    string = string.substring(i);
                    var s = string.indexOf(fun);
                    if (s == -1) {
                        return content;
                    }
                }
                break;
        }
    }
}

// ## The *processDir* function
// generates a ``translations.json`` file for the current directory, but does
// not override the previous file -- only augments it
function processDir(dir) {
    // JSON object for the current directory
    var dirJSON = {};
    // Path where translations will go
    var translations = path.join(dir, "translations.json");
    // Check for pre-existing ``translations.json`` file
    if(fs.existsSync(translations)) {
        var currJSON = JSON.parse(fs.readFileSync(translations, "utf8"));
        dirJSON = mergeObjs(dirJSON, currJSON);
    }

    // Build pattern matching for searchable files
    var extRegExpStr = "(";
    for(var i = 0; i < commander.extensions.length; i++) {
        extRegExpStr += commander.extensions[i];
        if(i < commander.extensions.length-1) { extRegExpStr += "|"; }
        else { extRegExpStr += ")$"; }
    }
    var extRegExp = new RegExp(extRegExpStr);

    // Process files in the current directory
    var files = fs.readdirSync(dir);
    files.forEach(function(file) {
        if(fs.statSync(path.join(dir, file)).isFile() && extRegExp.test(file)) {
            processFile(path.join(dir, file), dirJSON);
        }
        if(commander.recursive && fs.statSync(path.join(dir, file)).isDirectory() && file != '.git') {
            processDir(path.join(dir, file));
        }
    });

    // Output dirJSON to file
    fs.writeFileSync(translations, JSON.stringify(dirJSON, null, "	"), "utf8");
}

// Get the ball rollin'
processDir(commander.outputDir);
