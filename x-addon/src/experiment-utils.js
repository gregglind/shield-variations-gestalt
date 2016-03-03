/*
  Logic and functions for 'being an experiment with branches'.
*/

const {Ci, Cu} = require("chrome");
const { TelemetryController } = Cu.import("resource://gre/modules/TelemetryController.jsm");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");

let { merge } = require("sdk/util/object");
let prefs = require("sdk/simple-prefs").prefs;
let prefSvc = require("sdk/preferences/service");
let querystring = require("sdk/querystring");

let self = require('sdk/self');

function inTrial () {
  return prefSvc.get("shield.currentTrial")
}

function leaveTrial () {
  return prefSvc.reset("shield.currentTrial")
}

function userId () {
  return prefSvc.get("toolkit.telemetry.cachedClientID", "unknown")
}

function report(data) {
  data = merge({}, data ,{
    firstrun: prefs.firstrun,
    who: userId(),
    version: self.version
  });
  console.log("about to ping", data);
  let telOptions = {addClientId: true, addEnvironment: true}
  return TelemetryController.submitExternalPing("x-shield-trials", data, telOptions);
}

// equal probability choices from a list "choices"
function chooseVariation(choices,rng=Math.random()) {
  let l = choices.length;
  return choices[Math.floor(l*Math.random())];
}

function dateToUTC(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

/* convert `xSetupConfig` to a realized experimental runtime config

  xConfig <- xSetupConfig

  sets some addon prefs by side effect.

  callable multiple times.
*/
function xsetup (xSetupConfig) {
  /*
    xSetupConfig: {
      choices:  names of variations for chooseVariation,
      name: name of experiment
      surveyUrl: url
      duration:  in days
    }
  */
  if (prefs['firstrun'] === undefined) {
    prefs.firstrun = String(dateToUTC(new Date())) // in utc
  }
  let variation = prefs["variation"]
  if (variation === undefined) {
    prefs['variation'] = variation = chooseVariation(xSetupConfig.choices);
  }
  return {
    variation: variation,
    firstrun: prefs.firstrun,
    name: xSetupConfig.name,
    surveyUrl: xSetupConfig.surveyUrl,
    duration: xSetupConfig.duration
  }
}

function die (addonId=self.id) {
  require("sdk/addon/installer").uninstall(addonId);
};

// TODO: GRL vulnerable to clock time issues
function expired (xconfig, now = Date.now() ) {
  const days=86400*1000;
  return ((now - Number(xconfig.firstrun))/ days) > xconfig.duration;
}

// open a survey.
function survey(xconfig, extraQueryArgs={}) {
  let url = xconfig.surveyUrl;
  extraQueryArgs = merge({},
    extraQueryArgs,
    {
      variation: xconfig.variation,
      xname: xconfig.name,
      who: userId()
    }
  );
  if (extraQueryArgs) {
    url += "?" + querystring.stringify(extraQueryArgs);
  }

  console.log(url);
  require("sdk/tabs").open(url);
}

// useful for local dev
function fakeTelemetry () {
  prefSvc.set("toolkit.telemetry.server","http://localhost:5000")
}

// do all EXPERIMENT LOGIC during addon startup
let _eligible = true; // handle #20
function handleStartup (options, xconfig, variationsMod) {
  /*
    options: the bootstrap.js options.  `loadReason`

    xconfig: from xsetup().  Has specific branch, etc.

    variationsMod:
    - variations object:  variationName: callable
    - cleanup
  */

  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  console.log(options.loadReason);
  switch (options.loadReason) {
    case "install":
      // 1a. check eligibility, or kill the addon.
      if (!variationsMod.isEligible()) {
        report(merge({},xconfig,{msg:"ineligible"}));
        resetPrefs();
        _eligible = false;
        return die();  // gross, calls survey, don't want to!
      }
      // TODO GRL something to see if it's in another trial.

      // 1b. report install.
      report(merge({},xconfig,{msg:options.loadReason}));

    case "enable":
    case "startup":
    case "upgrade":
    case "downgrade":
      break;
  }

  // 2a. run -- do the effect.  SHOULD be able to called multiple times safely.
  var mybranchname = xconfig.variation;
  variationsMod.variations[mybranchname]();  // do the effect
  console.log("did the variation:", mybranchname);
  // 2b. report success
  report(merge({}, xconfig, {msg:"running"}));

  // 3a.  check expiration, and die with report if needed
  if (expired(xconfig)) {
      report(merge({},xconfig,{msg:"end-of-study"}));
      // 3b. survey for end of study
      survey(xconfig, {'reason': 'end-of-study'});
      variationsMod.cleanup();
      resetPrefs();
      die();
  }
}


function handleOnUnload (reason, xconfig, variationsMod) {
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  console.log('unload', reason);
  switch (reason) {
    case "uninstall":
    case "disable":
      // 4. user disable or uninstall.
      report(merge({}, xconfig, {msg:"user-ended-study"}));
      if (_eligible) {  // dont survey or cleanup if user wasn't eligible
        survey(xconfig, {'reason': 'user-ended-study'});
        variationsMod.cleanup();
      }
      resetPrefs();
      die();
      break;

      // 5. usual end of session.
    case "shutdown":
      report(merge({}, xconfig, {msg:"shutdown"}));
      break;

    case "upgrade":
    case "downgrade":
      break;
  }
}

function resetPrefs () {
  delete prefs.firstrun;
  delete prefs.variation;
}

module.exports = {
  report: report,
  chooseVariation: chooseVariation,
  xsetup: xsetup,
  die: die,
  expired: expired,
  survey: survey,
  fakeTelemetry: fakeTelemetry,
  handleStartup: handleStartup,
  handleOnUnload: handleOnUnload,
  resetPrefs: resetPrefs
}
