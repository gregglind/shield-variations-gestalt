const xutils = require("./experiment-utils")
const variationsMod = require("./variations");

// configuration / setup constants.  These are only ones needed.
const forSetup = {
  name: "screen performance A",
  choices: Object.keys(variationsMod.variations), // names of branches.
  duration: 7,   // in days,
  surveyUrl: "https://qsurvey.mozilla.com/s3/X-Firefox-Performance-Trial"
};

function main (options, callback) {
  var xconfig = xutils.xsetup(forSetup);  // call first.
  xutils.handleStartup(options, xconfig, variationsMod);
}

// Annoying:  `onUnload` can get called multiple time during unload.
// force it to run only once.
// calling xsetup during teardown (more than once) cause pref setting bugs
var unloading = false;
function onUnload (reason) {
  if (unloading) return;
  unloading = true;

  var xconfig = xutils.xsetup(forSetup);  // call first.
  xutils.handleOnUnload(reason, xconfig, variationsMod);
}

exports.main = main;
exports.onUnload = onUnload
