/*
  Logic and functions for 'being an experiment with branches'.
*/

const {Ci, Cu} = require("chrome");
const { TelemetryController } = Cu.import("resource://gre/modules/TelemetryController.jsm");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");
const CID = Cu.import("resource://gre/modules/ClientID.jsm");

let { merge } = require("sdk/util/object");
let prefs = require("sdk/simple-prefs").prefs;
let prefSvc = require("sdk/preferences/service");
let querystring = require("sdk/querystring");
const { setInterval } = require("sdk/timers");

let self = require('sdk/self');

const DAY = 86400*1000;

// ongoing within-addon fuses / timers
let lastDailyPing = Date.now();

/*
  Event target for things?

  - die
  - report
  - survey?
  - module level 'fake it', affects 'report, die'

*/


const STUDYPREF = "shield.currentSTUDY";

const studyManager = {
  current:  () => prefSvc.get(STUDYPREF),
  leave:  () => prefSvc.reset(STUDYPREF),
  join: (name) => prefSvc.set(STUDYPREF, name)
};

// works by side effect / async.  No guarantees
function generateTelemetryIdIfNeeded() {
  let id = TelemetryController.clientID;
  if (id == undefined) {
    return CID.ClientIDImpl._doLoadClientID()
  } else {
    return Promise.resolve(id)
  }
}

function userId () {
  return prefSvc.get("toolkit.telemetry.cachedClientID","unknown");
}

function report(data) {
  data = merge({}, data ,{
    firstrun: prefs.firstrun,
    version: self.version
  });
  console.log("about to ping", data);
  let telOptions = {addClientId: true, addEnvironment: true}
  return TelemetryController.submitExternalPing("x-shield-studies", data, telOptions);
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
    duration: xSetupConfig.duration,
    who:  userId()
  }
}

function die (addonId=self.id) {
  require("sdk/addon/installer").uninstall(addonId);
};

// TODO: GRL vulnerable to clock time issues #1
function expired (xconfig, now = Date.now() ) {
  return ((now - Number(xconfig.firstrun))/ DAY) > xconfig.duration;
}

// open a survey.
function survey(xconfig, extraQueryArgs={}) {
  let url = xconfig.surveyUrl;
  // get user info.
  extraQueryArgs = merge({},
    extraQueryArgs,
    {
      variation: xconfig.variation,
      xname: xconfig.name,
      who: xconfig.who,
      updateChannel: Services.appinfo.defaultUpdateChannel,
      fxVersion: Services.appinfo.version,
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

function dieIfExpired(xconfig, variationsMod) {
  if (expired(xconfig)) {
      _userDisabled = false;
      report(merge({},xconfig,{msg:"end-of-study"}));
      // 3b. survey for end of study
      survey(xconfig, {'reason': 'end-of-study'});
      variationsMod.cleanup();
      resetPrefs();
      die();
  }
}

function timerFunction(xconfig, variationsMod) {
  // check for new day, phone home if true.
  let t = Date.now();
  if ((t - lastDailyPing) >= DAY) {
    lastDailyPing = t;
    report(merge({}, xconfig, {msg:"running"}));
  }

  // check expiration, and die with report if needed
  dieIfExpired(xconfig, variationsMod);
}

// do all EXPERIMENT LOGIC during addon startup
let _userDisabled = true; // handle #20
function handleStartup (options, xconfig, variationsMod) {
  /*
    options: the bootstrap.js options.  `loadReason`

    xconfig: from xsetup().  Has specific branch, etc.

    variationsMod:
    - variations object:  variationName: callable
    - cleanup
  */

  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  switch (options.loadReason) {
    case "install":
      // 1a. check eligibility, or kill the addon.
      if (!variationsMod.isEligible()) {
        report(merge({},xconfig,{msg:"ineligible"}));
        resetPrefs();
        _userDisabled = false;
        return die();  // gross, calls survey, don't want to!
      }
      // TODO GRL something to see if it's in another trial. #3
      /*
        let curtrial = studyManager.current();
        if (curtrial && curtrial != xconfig.name) {
          report(merge({},xconfig,{msg:"in-other-trial"}));
          resetPrefs();
          _userDisabled = false;
        return die();  // gross, calls survey, don't want to!
      }
      studyManager.join(xconfig.name);

      ## needs code to 'leave' trial at all places.
      ## needs test code
      */

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

  // check once, right away.
  dieIfExpired(xconfig, variationsMod);

  // then every 5 minutes
  let _pulseTimer = setInterval(timerFunction.bind(null, xconfig, variationsMod), 5*60*1000 /*5 minutes*/)
}


function handleOnUnload (reason, xconfig, variationsMod) {
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  console.log('unload', reason);
  switch (reason) {
    case "uninstall":
    case "disable":
      // 4. user disable or uninstall.
      report(merge({}, xconfig, {msg:"user-ended-study"}));
      if (_userDisabled) {  // dont survey or cleanup if user wasn't eligible
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
  resetPrefs: resetPrefs,
  studyManager: studyManager,
  generateTelemetryIdIfNeeded: generateTelemetryIdIfNeeded
}
