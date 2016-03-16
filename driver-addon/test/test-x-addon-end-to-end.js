var { expect } = require("chai");

const tabs = require("sdk/tabs");
const prefSvc = require("sdk/preferences/service");
let { merge } = require("sdk/util/object");
let prefs = require("sdk/simple-prefs").prefs;
let installer = require("sdk/addon/installer");
let self = require('sdk/self');
const { setTimeout } = require("sdk/timers");

let testUtils = require("./utils");

console.log(self, self.data);

// make our lives easier.
prefSvc.set("toolkit.telemetry.server","http://localhost:5000")
prefSvc.set("xpinstall.signatures.required",false);
prefSvc.set("xpinstall.whitelist.required",false);

// specific to this experiment... needs npm run serve
const addonUrl = "http://localhost:3555/x-screen-draw-performance-variations-1.xpi";

const addonId = "@x-screen-draw-performance-variations-1";
const PAINTPREF = 'nglayout.initialpaint.delay';

function getAddonPref (name) {
  return prefSvc.get("extensions.@x-screen-draw-performance-variations-1." + name);
}

function setAddonPref (name, val) {
  return prefSvc.set("extensions.@x-screen-draw-performance-variations-1." + name, val);
}

function resetPrefs () {
  prefSvc.reset(PAINTPREF);
  console.log('reset pref!');
}

function installAddon() {
  console.log(addonUrl);
  return testUtils.installUrl(addonUrl);  // promise.
}

function uninstall () {
  return installer.uninstall(addonId);
}

function reset () {
  testUtils.only1Tab();
  resetPrefs();
}

function waitABit (val) {
  return new Promise(function(resolve, reject) {
    console.log("waiting a bit");
    setTimeout(()=>resolve(val),2000);
  })
}

function hasAddon(id=addonId) {
  return new Promise((res,rej) => {
    installer.getAddon(id).then(
      ()=>res(true),
      ()=>res(false)
    )
  })
}

var addonErrors = {};
addonErrors[installer.ERROR_NETWORK_FAILURE ] = "ERROR_NETWORK_FAILURE";
addonErrors[installer.ERROR_INCORRECT_HASH  ] = "ERROR_INCORRECT_HASH";
addonErrors[installer.ERROR_CORRUPT_FILE    ] = "ERROR_CORRUPT_FILE";
addonErrors[installer.ERROR_FILE_ACCESS     ] = "ERROR_FILE_ACCESS";


function cleanup () {
  return uninstall().then(
    waitABit).then(
    testUtils.only1Tab)
};

function hasTabWithUrlLike(thing) {
  for (let tab of tabs) {
    console.log("tab:", tab.url);
    if (thing.test(tab.url)) return true
  }
  return false;
}

exports['test 1: install, normal install'] = function (assert, done) {

  // ### Prep:
  // 1. `about:config` reset / unset  `nglayout.initialpaint.delay`
  reset();

  // 2. install addon
  installAddon().then(waitABit).then(
    (s) => {
      // tests.
      expect(getAddonPref("firstrun"), "firstrun is number").to.be.a.number;
      expect(getAddonPref("variation"), "variation valid").to.be.oneOf(['ut','aggressive','medium']);
      expect(tabs.length, "one tab open").to.equal(1);
      // cleanup
      cleanup().then(done);
    },
    (r) => {
      console.log("reject", addonErrors[r]);
      expect(false,"in the reject").to.be.true;
      done();
    }
  )
}


exports['test 2: install addon, but ineligible.'] = function (assert, done) {
  reset();

  // ### Prep:
  //
  // 1. set `nglayout.initialpaint.delay` to `13` (or any value)
  prefSvc.set(PAINTPREF,13); // some value

  // 2. install addon.
  installAddon().then(waitABit).then(

  // get addon
  hasAddon).then(
  // ### Expect:
  //
    (addonThere) => {
      // 1. addon will briefly install.
      // 2. addon will die (`about:addons` will no longer show it)
      expect(addonThere).to.be.false;
      // 3. local prefs (`extensions.@x-screen-draw-performance-variations-1`) are reset / empty
      expect(getAddonPref("firstrun"), "firstrun should be undef").to.be.undefined;
      expect(getAddonPref("variation"), "variation should be undef").to.be.undefined;
      // 4. NO SURVEY.
      expect(hasTabWithUrlLike(/qsurvey/),"no survey").to.be.false;
      // 5.  `nglayout.initialpaint.delay` still 13
      expect(prefSvc.get(PAINTPREF),"PAINTPREF not affected by uninstall").to.equal(13);
      expect(tabs.length, "one tab open").to.equal(1);
    }
  ).then(reset).then(done);
}


exports['test 3: Setup a particular arm, startup'] = function (assert, done) {
  // ### Prep:
  //
  //1.  reset `nglayout.initialpaint.delay
  reset();

  //2.  create `extensions.@x-screen-draw-performance-variations-1.variation` as 'medium'
  setAddonPref("variation","medium")

  installAddon().then(waitABit).then(

  // ### Expect:
    () => {
      // 1.  pref `nglayout.initialpaint.delay` will be `50`
      expect(prefSvc.get(PAINTPREF), "pref is now 50").to.equal(50);
      expect(tabs.length, "one tab open").to.equal(1);

  }).
  then(reset).then(done);
}

/*
### Prep:

1.  reset `nglayout.initialpaint.delay
2.  Force a past date.  Create `extensions.@x-screen-draw-performance-variations-1.firstrun` to `500`  (i.e., the dawn of time)
3.  install the addon

### Expect

1.  addon will install successfully
2.  then immediately `die` because it is too old.
3.  Observer survey opened with `reason=end-of-study` in the url
4.  all `@x-screen` prefs will be cleared.

### Cleanup.

1.  Close survey tab.
*/
exports['test 4: end-of-study'] = function (assert, done) {
  // ### Prep:
  //
  //1.  reset `nglayout.initialpaint.delay
  reset();

  //2.  Force a past date.  Create `extensions.@x-screen-draw-performance-variations-1.firstrun` to `500`  (i.e., the dawn of time)
  setAddonPref("firstrun", 500);

  // 3.  install the addon
  installAddon().then(waitABit).then(
  hasAddon).then(
    // Expect
    (addonThere) => {
      // 1. addon will briefly install.
      // 2. addon will die (`about:addons` will no longer show it)
      expect(addonThere).to.be.false;
      // 3.  open a survey with `reason=user-ended-study` in the url
      expect(hasTabWithUrlLike(/reason=end-of-study/),"has surveyUrl, user-ended-study").to.be.true;
      expect(tabs.length, "2 tabs open").to.equal(2);

      // 4.  all `@x-screen` prefs will be cleared
      expect(getAddonPref("firstrun"), "firstrun should be undef").to.be.undefined;
      expect(getAddonPref("variation"), "variation should be undef").to.be.undefined;
    }
  ).then(reset).then(done);
};



exports['test 5: user-disables addon'] = function (assert, done) {
  // ### Prep:
  //
  //1.  reset `nglayout.initialpaint.delay
  reset();

  // 2.  install addon.
  installAddon().then(waitABit).then(
    // 3.  from `about:addons` disable or uninstall.
    ()=>installer.disable(addonId)).then(waitABit).then(
    () => {
      // ### Expect
      // 1.  addon will install successfully
      // 2.  then immediately `die` because it is too old.
      // 3.  Observer survey opened with `reason=end-of-study` in the url
      expect(hasTabWithUrlLike(/reason=user-ended-study/),"has surveyUrl, user-ended-study").to.be.true;
      expect(tabs.length, "2 tabs open").to.equal(2);

      // 4.  all `@x-screen` prefs will be cleared.
      expect(getAddonPref("firstrun"), "firstrun should be undef").to.be.undefined;
      expect(getAddonPref("variation"), "variation should be undef").to.be.undefined;
    }
  ).then(reset).then(done);
};

require("sdk/test").run(exports);
