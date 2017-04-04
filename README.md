Cocache library and plugins by Instructure.

Refer to each package's readme under `packages/`.

## Development

Install [Lerna](https://github.com/lerna/lerna):

    npm install lerna

Then set up the workspace:

    ./node_modules/.bin/lerna bootstrap

Then you can use its helpers to run tests and publish. For example:

    ./node_modules/.bin/lerna run test

Will run test for all the packages.