let prefSvc = require("sdk/preferences/service");
let prefs = require("sdk/simple-prefs").prefs;

const PAINTPREF = 'nglayout.initialpaint.delay';

const variations = {
  'agressive':  function () {
    prefSvc.set(PAINTPREF,5);
  },
  'medium':  function () {
    prefSvc.set(PAINTPREF,100);
  },
  'control':  () => {}  // 230
}

function isEligible () {
  //boolean : Returns whether or not the application preference name both exists and has been set to a non-default value by the user (or a program acting on the user's behalf).
  return !prefSvc.isSet(PAINTPREF);  // exist
}

function cleanup () {
  prefSvc.reset(PAINTPREF);
  // should also clean all simple prefs
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
