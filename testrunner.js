//#!/usr/bin/env node

/**
 *
 */
// TODO: clean this up, it looks like crap.
//////////////////////////////////
var se = require('se-interpreter');
var fs = require('fs');
var glob = require('glob');
var _ = require('underscore');
var argv = require('optimist').demand(1).usage('WTF').argv;
var colors = require('colors');
var util = require('util');
//////////////////////////////////
//////////////////////////////////
var override_settings = {
	"driverOptions" : {},
	"browserOptions" : {}
};
var listenerOptions = {};
var configurations = [];
//////////////////////////////////

/**************************************************
 * This is the same listener generator that is in *
 * se-interpreter, except that it uses the colors *
 * module. I am doing this because the way the    *
 * SGR params are set by se-interpreter sometimes *
 * breaks PuTTY.                                  *
 **************************************************/
function getInterpreterListener(testRun) {
  return {
    'startTestRun': function(testRun, info) {
      if (info.success) {
        console.log(testRun.name + (": Starting test " + testRun.name).green);
      } else {
        console.log(testRun.name + (": Unable to start test " + testRun.name + ": " + util.inspect(info.error)).red);
      }
    },
    'endTestRun': function(testRun, info) {
      if (info.success) {
        console.log(testRun.name + ": Test passed".bold.green);
      } else {
        if (info.error) {
          console.log(testRun.name + (": Test failed: " + util.inspect(info.error)).bold.red);
        } else {
          console.log(testRun.name + ": Test failed".bold.red);
        }
      }
    },
    'startStep': function(testRun, step) {
      console.log(testRun.name + ": " + JSON.stringify(step));
    },
    'endStep': function(testRun, step, info) {
      if (info.success) {
        console.log(testRun.name + ": Success".green);
      } else {
        if (info.error) {
          console.log(testRun.name + (": " + util.inspect(info.error)).red);
        } else {
          console.log(testRun.name + ": Failed".yellow);
        }
      }
    }
  };
}

// Iterate over argv keys and add to override_settings.
for (var key in argv) {
	var ar = null;
	if ( ar = /^browser-(.*)$/.exec(key)) {
		// browser option
		override_settings.browserOptions[ar[1]] = argv[key];
	} else if ( ar = /^driver-(.*)$/.exec(key)) {
		// driver option
		override_settings.driverOptions[ar[1]] = argv[key];
	} else if ( ar = /^listener-(.*)$/.exec(key)) {
		listenerOptions[ar[1]] = argv[key];
	}
}

// Iterate over paths and parse configs.
// TODO: refactor into functions.
argv._.forEach(function(path2glob) {
	//debugger;
	glob.sync(path2glob).forEach(function(path) {
		// debugger;
		if (/\.json$/.test(path)) {
			// Parse JSON file
			var conf = null;
			try {
				conf = JSON.parse(fs.readFileSync(path));
			} catch(er) {
				console.error("Cannot load " + path + " : " + er);
				process.exit(1);
			}
			// Check that type is "interpreter-config+"
			if (conf.type !== 'interpreter-config' && conf.type !== 'interpreter-config+') {
				return;
			}
			// Iterate over configurations
			conf.configurations.forEach(function(configuration) {
				// Get settings and scripts
				var settings = configuration.settings;
				var scripts = configuration.scripts;
				// Iterate over settings.
				settings.forEach(function(setting) {
					//debugger;
					// apply override_settings.
					setting.browserOptions = _.extend(setting.browserOptions, override_settings.browserOptions);
					setting.driverOptions = _.extend(setting.driverOptions, override_settings.driverOptions);
					// Iterate over scripts
					scripts.forEach(function(script) {
						// If string then glob and foreach path create test run
						// debugger;
						if ( typeof script === 'string') {
							glob.sync(script).forEach(function(s) {
								var tr = se.createTestRun(s, (argv.noPrint || argv.silent), getInterpreterListener, null, setting.browserOptions, setting.driverOptions, listenerOptions);
								configurations.push(tr);
							});
						}// Else If obj then
						else if ( typeof script === 'object') {
							// get overrides
							var overrides = script.overrides;
							for (var i = 0; i < script.scripts.length; i++) {
								glob.sync(script.scripts[i]).forEach(function(s) {
									var name = /.*(?:\/|\\)(.*)\.json/.exec(s)[1];
									try {
										s = JSON.parse(fs.readFileSync(s));
									} catch(er) {
										console.error("Problem loading script " + s + ": " + er);
										return;
									}
									// foreach step, foreach override
									//debugger;
									s.steps.forEach(function(step) {
										_.where(overrides, {
											type : step.type
										}).forEach(function(o) {
											if (step[o.key] === o.from) {
												step[o.key] = o.to;
											}
										});
									});
									name = s.name || name;
									var tr = new se.TestRun(s, name);
									tr.browserOptions = setting.browserOptions;
									tr.driverOptions = setting.driverOptions;
									tr.silencePrints = argv.noPrint || argv.silent;
									tr.listener = getInterpreterListener(tr, listenerOptions);
									configurations.push(tr);
								});
							}
						}
					});
				});
			});

		}
	});
});

// DEBUG //
//console.log(configurations);
// DEBUG //

// run tests
var index = -1;
var success = 0;
function runNext() {
	index++;
	if (index < configurations.length) {
		configurations[index].run(function(info) {
			success += (info.success) ? 1 : 0;
			runNext();
		});
	} else if (index === configurations.length) {
		if (!argv.silent) {
			//console.log("\x1b[" + (success == configurations.length ? "32" : "31") + "m\x1b[1m" + success + '/' + configurations.length + ' tests ran successfully. Exiting.\x1b[30m\x1b[0m');
			var msg = success + '/' + configurations.length + ' tests ran successfully. Exiting.';
			console.log(msg[success === configurations.length ? "green" : "red"]);
		}
		process.on('exit', function() {
			process.exit(success == configurations.length ? 0 : 1);
		});
	}
}

runNext();

