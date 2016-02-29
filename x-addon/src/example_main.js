// index.js

let { merge } = require("sdk/util/object");
const xutils = require("./experiment-utils")
const variations = require("./variations");
  /* {
    variations, object of functions to call the implement the variations.
    cleanup: function that undoes all the variations.
  }*/

// configuration / setup constants.  These are only ones needed.
const forSetup = {
  name: "gregg experiment 1",
  choices: Object.keys(variations.variations), // names of branches.
  duration: 7,   // in days,
  surveyUrl: "https://app.surveygizmo.com/login/v1"
};


function main (options, callback) {
  xutils.fakeTelemetry();

  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload

  var xconfig = xutils.xsetup(forSetup);  // call first.

  // handle all experiment logic... // TODO: put this in xutils?
  switch (options.loadReason) {
    case "install":
      // 1a. check eligibility, or kill the addon.
      if (!variations.isEligible()) {
        xutils.report(merge({},xconfig,{msg:"ineligible"}));
        variations.cleanup();
        return xutils.die();
      }
      // 1b. report install.
      xutils.report(merge({},xconfig,{msg:"install"}));
      break;
    case "enable":
      break;
    case "startup":
      // 2a. startup -- do the effect.  should be able to be called multiple safely.
      var variation = xconfig.variation
      variations.variations[variation]();  // do the effect
      // 2b. report success
      xutils.report(merge({},xconfig,{msg:"startup"}));
      break;

    // if needed, do these
    case "upgrade":
    case "downgrade":
      break;

    // 3a.  check expiration, and die with report if needed
    if (xutils.expired(xconfig)) {
        xutils.report(merge({},xconfig,{msg:"expired"}));
        // 3b. survey for end of study
        xutils.survey(xconfig)
        variations.cleanup();
        xutils.die();
    }
  }
}

function onUnload (options, callback) {
  // https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload
  switch (options.loadReason) {
    case "uninstall":
    case "disable":
      // 4. user disable or uninstall.
      xutils.report(merge({}, xconfig, {msg:"uninstall"}));
      variations.cleanup();
      xutils.die();
      break;

      // 5. usual end of session.
    case "shutdown":
      xutils.report(merge({}, xconfig, {msg:"shutdown"}));
      break;

    case "upgrade":
    case "downgrade":
      break;
  }
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

