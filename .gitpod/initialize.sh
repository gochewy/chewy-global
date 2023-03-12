 git submodule update --init --recursive
 git submodule update --recursive

(cd contributor-cli && yarn install && yarn build)
/workspace/chewy-global/contributor-cli/bin/chewy-cc git checkout main

(cd docs && yarn install)
(cd cli && yarn install && yarn build)
(cd lib && yarn install)