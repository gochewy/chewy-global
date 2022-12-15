 git submodule update --init --recursive
 git submodule update --recursive
(cd docs && yarn install)
(cd contributor-cli && yarn install && yarn build)
(cd cli && yarn install && yarn build)
(cd lib && yarn install)