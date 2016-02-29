const {Ci, Cu} = require("chrome");
const { TelemetryController } = Cu.import("resource://gre/modules/TelemetryController.jsm");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");

let prefs = require("sdk/simple-prefs").prefs;
let prefSvc = require("sdk/preferences/service");

let id = require('sdk/self').id

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

module.exports = {
  report: report,
  chooseVariation: chooseVariation,
  xsetup: xsetup,
  die: die,
  expired: expired,
  survey: survey,
  fakeTelemetry: fakeTelemetry
}
