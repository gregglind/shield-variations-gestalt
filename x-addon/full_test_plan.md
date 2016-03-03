# End-to-end test plan for 'x-screen-draw-performance-variations'

## Ownership:

- Author:  Gregg Lind <glind@m.c>
- Test Plan Version: 1

## General Prep.

Use the shield-variations-gestalt/testing-helper-addon

OR: 

1.  Open:
	
	1. `about:config`
	2. `about:addons`

2.  set:

 		1. `general.warnOnAboutConfig`, `false`



## Test 1:  install addon, normal install.

### Prep:

1. `about:config` reset / unset  `nglayout.initialpaint.delay`
2. install addon

### Expect:

1. `about:config`

   check these prefs:
   
   1.  `extensions.@x-screen-draw-performance-variations-1.firstrun`

   		Should be: `1456940036000` or simliar `Date.now()`

   2. `extensions.@x-screen-draw-performance-variations-1.variation`

  		Should be:  one of `ut`, `medium`, `aggressive`

### Cleanup

1.  Uninstall addon
2.  Close survey tab.

## Test 2:  install addon, but ineligible.

### Prep:

1. set `nglayout.initialpaint.delay` to `13` (or any value)
2. install addon.

### Expect:

1. addon will briefly install.
2. addon will die (`about:addons` will no longer show it)
3. local prefs (`extensions.@x-screen-draw-performance-variations-1`) are reset / empty
4. NO SURVEY. 
5. 	`nglayout.initialpaint.delay` still 13 

### Cleanup:

(none)


## Test 3: Setup a particular arm, startup

### Prep:

1.  reset `nglayout.initialpaint.delay
2.  create `extensions.@x-screen-draw-performance-variations-1.variation` as 'medium'
3.  restart firefox

### Expect

1.  pref `nglayout.initialpaint.delay` will be `50`


### Cleanup 

1.  Uninstall addon
2.  Close survey tab.


## Test 4: 'end of study'

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

## Test 4: 'user-disable'

### Prep:

1.  reset `nglayout.initialpaint.delay'
2.  install addon.
3.  from `about:addons` disable or uninstall.


### Expect

1.  open a survey with `reason=user-ended-study` in the url
2.  all `@x-screen` prefs will be cleared

### Cleanup

1.  Close Survey Tab.


## FAQ

1.  These step are a hassle!

    I know, sorry :(
    
2.  I have an idea for how to make that better!

    Cool, tell Gregg!
    
3.  Maybe an addon could do all these steps?

	I agree!  Considering it!
    

