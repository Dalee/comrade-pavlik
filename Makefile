# Set up NPM and NODE bin from env if provided
NPM ?= npm
NODE ?= node
COVERAGE_DIR ?= "./coverage"

# Package managers defaults
npm-install := $(NPM) install

vagrant:
	$(npm-install) --silent

test:
	$(NODE) ./node_modules/.bin/eslint src/
	$(NODE) ./node_modules/.bin/mocha

coverage:
	$(NODE) ./node_modules/.bin/babel-node \
		./node_modules/.bin/babel-istanbul cover --report=clover --report=lcov \
		./node_modules/.bin/_mocha --dir=$(COVERAGE_DIR)

test-coverage: test coverage

.PHONY: vagrant test coverage test-coverage
