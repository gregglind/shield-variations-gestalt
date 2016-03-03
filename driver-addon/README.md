# Driver to drive the built xpi.

## Use:

```
# cd x-addon, build the addon.
```

```
# 2.  here.
npm install

cp ../x-addon/*xpi .

# serve at localhost:3555
npm run serve &

npm run test
```

## Goal

Copies the plan at `../x-addon/full_test_plan.md`


## Caveats

1.  This is still not QUICK or AWESOME, but it works.  Mostly.
2.  Reading the debug output from the tests is *awful*.
