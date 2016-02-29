const {Ci, Cu} = require("chrome");
const { TelemetryController } = Cu.import("resource://gre/modules/TelemetryController.jsm");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");

let { merge } = require("sdk/util/object");
let prefs = require("sdk/simple-prefs").prefs;
let prefSvc = require("sdk/preferences/service");

let id = require('sdk/self').id

function inTrial () {
  return prefSvc.get("shield.currentTrial")
}

function leaveTrial () {
  return prefSvc.reset("shield.currentTrial")
}

// this is just to demo that we can track packets.
function idUser () {
  return Services.downloads.userDownloadsDirectory.path
}

function report(data) {
  // {branch:"some branch", "experiment": "something"}

  // extend it.
  data.firstrun = prefs.firstrun;
  data.who = idUser()
  console.log("about to ping", data);
  let telOptions = {addClientId: true, addEnvironment: true}
  return TelemetryController.submitExternalPing("x-shield-trials", data, telOptions);
}

function chooseVariation(choices,rng=Math.random()) {
  let l = choices.length;
  return choices[Math.floor(l*Math.random())]
}


function dateToUTC(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function xsetup (xconfig) {
  /*
    config: {
      choices:  list of choice for chooseVariation
    }
  */
  if (prefs['firstrun'] === undefined) {
    prefs.firstrun = String(dateToUTC(new Date())) // in utc
  }
  let variation = prefs["variation"]
  if (variation === undefined) {
    prefs['variation'] = variation = chooseVariation(xconfig.choices);
  }
  return {
    variation: variation,
    firstrun: prefs.firstrun,
    name: xconfig.name,
    surveyUrl: xconfig.surveyUrl
  }
}

function die () {
  require("sdk/addon/installer").uninstall(id)
};


// TODO: GRL vulnerable to clock time
function expired (xconfig, now = Date.now() ) {
  const days=86400*1000;
  return (now - xconfig.firstrun) > xconfig.duration
}

function survey(xconfig) {
  require("sdk/tabs").open(xconfig.surveyUrl);
}

function fakeTelemetry () {
  let prefSvc = require("sdk/preferences/service");
  prefSvc.set("toolkit.telemetry.server","http://localhost:5000")
}

function handleStartup (options, xconfig, variationsMod) {
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  switch (options.loadReason) {
    case "install":
      // 1a. check eligibility, or kill the addon.
      if (!variationsMod.isEligible()) {
        report(merge({},xconfig,{msg:"ineligible"}));
        variationsMod.cleanup();
        return die();
      }
      // TODO GRL something to see if it's in another trial.

      // 1b. report install.
      report(merge({},xconfig,{msg:options.loadReason}));

      // fall through! to startup.
    case "enable":
    case "startup":
      // 2a. startup -- do the effect.  should be able to be called multiple safely.
      var variation = xconfig.variation
      variationsMod.variations[variation]();  // do the effect
      console.log("did the variation:", variation);
      // 2b. report success
      report(merge({},xconfig,{msg:options.loadReason}));
      break;

    // if needed, do these
    case "upgrade":
    case "downgrade":
      break;

    // 3a.  check expiration, and die with report if needed
    if (expired(xconfig)) {
        report(merge({},xconfig,{msg:"expired"}));
        // 3b. survey for end of study
        survey(xconfig)
        variationsMod.cleanup();
        die();
    }
  }
}


function handleOnUnload (options, xconfig, variationsMod) {
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  switch (options.loadReason) {
    case "uninstall":
    case "disable":
      // 4. user disable or uninstall.
      report(merge({}, xconfig, {msg:"uninstall"}));
      variationsMod.cleanup();

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

module.exports = {
  report: report,
  chooseVariation: chooseVariation,
  xsetup: xsetup,
  die: die,
  expired: expired,
  survey: survey,
  fakeTelemetry: fakeTelemetry,
  handleStartup: handleStartup,
  handleOnUnload: handleOnUnload
}
