let prefSvc = require("sdk/preferences/service");
let prefs = require("sdk/simple-prefs").prefs;

const PAINTPREF = 'nglayout.initialpaint.delay';

const variations = {
  'aggressive':  function () {
    prefSvc.set(PAINTPREF,5);
  },
  'medium':  function () {
    prefSvc.set(PAINTPREF,50);
  },
  'weak':  function () {
    prefSvc.set(PAINTPREF,1000);
  },
  'ut':  () => {}  // 230  // ut:: usual treatment
}

function isEligible () {
  //boolean : Returns whether or not the application preference name both exists and has been set to a non-default value by the user (or a program acting on the user's behalf).
  return !prefSvc.isSet(PAINTPREF);
}

function cleanup () {
  prefSvc.reset(PAINTPREF); // resets to string!
}

// useful for testing
function makeIneligible () {
  prefSvc.set(PAINTPREF,1);
}

function makeEligible () {
  prefSvc.reset(PAINTPREF);
}

module.exports = {
  isEligible: isEligible,
  cleanup: cleanup,
  variations: variations,
  makeIneligible: makeIneligible,
  makeEligible: makeEligible
}
