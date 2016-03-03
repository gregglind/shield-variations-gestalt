
const { Cc, Ci, Cu } = require("chrome");
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");
const { defer } = require("sdk/core/promise");
const { setTimeout } = require("sdk/timers");

const tabs = require("sdk/tabs");

function only1Tab () {
  let first = true;
  for (let tab of tabs) {
    if (first) {
      first = false;
      continue;
    }
    tab.close();
  };
  console.log("only 1 tab", tabs.length);
}



// modified from https://dxr.mozilla.org/mozilla-central/source/addon-sdk/source/lib/sdk/addon/installer.js
exports.installUrl = function installUrl(url) {
  let { promise, resolve, reject } = defer();

  // Listen for installation end
  let listener = {
    onInstallEnded: function(aInstall, aAddon) {
      aInstall.removeListener(listener);
      // Bug 749745: on FF14+, onInstallEnded is called just before `startup()`
      // is called, but we expect to resolve the promise only after it.
      // As startup is called synchronously just after onInstallEnded,
      // a simple setTimeout(0) is enough
      setTimeout(resolve, 0, aAddon.id);
    },
    onInstallFailed: function (aInstall) {
      aInstall.removeListener(listener);
      reject(aInstall.error);
    },
    onDownloadFailed: function(aInstall) {
      this.onInstallFailed(aInstall);
    }
  };

  // Order AddonManager to install the addon
  AddonManager.getInstallForURL(url, function(install) {
    if (install.error != null) {
      install.addListener(listener);
      install.install();
    } else {
      reject(install.error);
    }
  },
    "application/x-xpinstall"  // mime type, required
  );

  return promise;
};



exports.only1Tab = only1Tab;
