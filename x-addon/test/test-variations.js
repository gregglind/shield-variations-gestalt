var { expect } = require("chai");
let prefSvc = require("sdk/preferences/service");

const PAINTPREF = 'nglayout.initialpaint.delay';

var variationsMod = require("../src/variations");

exports['test right keys'] = function (assert) {
  let expected = ["isEligible","cleanup","variations","makeEligible","makeIneligible"];
  expect(variationsMod).to.have.all.keys(expected);
}

exports['test all variations are functions'] = function (assert) {
  for (let k in variationsMod.variations) {
    expect(variationsMod.variations[k]).to.be.a("function");
  }
}

exports['test cleanup works'] = function (assert) {
  prefSvc.set(PAINTPREF, 13);
  expect(prefSvc.get(PAINTPREF)).to.equal(13);
  variationsMod.cleanup();
  expect(prefSvc.get(PAINTPREF, 250)).to.equal(250);
}

exports['test isEligible'] = function (assert) {
  // elibible is ONLY the pref is unset or normal value
  variationsMod.cleanup();
  expect(variationsMod.isEligible()).to.be.true;
  prefSvc.set(PAINTPREF, 13);
  expect(variationsMod.isEligible()).to.be.false;
  variationsMod.cleanup();
}

exports['test variations are functions'] = function (assert) {
  for (let k in variationsMod.variations) {
    expect(variationsMod.variations[k]).to.be.a("function");
  }
}

require("sdk/test").run(exports);
