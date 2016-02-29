// index.js

let { merge } = require("sdk/util/object");
const xutils = require("./experiment-utils")
const variationsMod = require("./variations");
  /* {
    variations, object of functions to call the implement the variations.
    cleanup: function that undoes all the variations.
  }*/

// configuration / setup constants.  These are only ones needed.
const forSetup = {
  name: "gregg experiment 1",
  choices: Object.keys(variationsMod.variations), // names of branches.
  duration: 7,   // in days,
  surveyUrl: "https://app.surveygizmo.com/login/v1"
};


function main (options, callback) {
  xutils.fakeTelemetry();
  var xconfig = xutils.xsetup(forSetup);  // call first.
  xutils.handleStartup(options, xconfig, variationsMod);
}

function onUnload (options, callback) {
  xutils.handleOnUnload(options, xconfig, variationsMod);
}

exports.main = main;
exports.onUnload = onUnload






/*
linting:
- what is enroll population?
- what is effect a,b,c....
- what is control mean
- do you 'undo'
- are risks and benefits well defined
- what should effect be
  - retention
  - total hours
- outro survey.

Uninstall shoudl:
- reset all settings and effects
- open survey?  If user uninstalls?  pass a pref "uninstall" to ask about exp.
- fire an uninstall ping

Death / apoptosis should:
- reset
- fire end of study survey

Other things:
- record arm
- record 'start' using a 'real clock' AND local clock
- record than an trial is in process so that other addons know????????
*/

