const xutils = require("./experiment-utils")
const variationsMod = require("./variations");

// configuration / setup constants.  These are only ones needed.
const forSetup = {
  name: "screen performance A",
  choices: Object.keys(variationsMod.variations), // names of branches.
  duration: 7,   // in days,
  surveyUrl: "https://qsurvey.mozilla.com/s3/X-Firefox-Preformance-Trial"
};

function main (options, callback) {
  //xutils.fakeTelemetry();
  var xconfig = xutils.xsetup(forSetup);  // call first.
  xutils.handleStartup(options, xconfig, variationsMod);
}

function onUnload (reason) {
  var xconfig = xutils.xsetup(forSetup);  // call first.
  xutils.handleOnUnload(reason, xconfig, variationsMod);
}

exports.main = main;
exports.onUnload = onUnload
