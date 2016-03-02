# X-Addon-Shield-Trials

Addon that implements the layout performance experiment.

## Build

### local

npm install -g jpm  # to allow building
jpm run  # or xpi, test, etc.


### to deploy

(After you have `node` and `npm`)

```
npm install -g jpm  # to allow building
# put your signing secret in .api-secret

npm run build  # needs a signing secret
npm test
```


