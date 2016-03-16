#!/bin/bash

set -o errexit
set -o nounset
shopt -s expand_aliases


cd ../x-addon
npm run local:build
cd ../driver-addon
cp ../x-addon/x-screen-draw-performance-shield-study-1.xpi .


