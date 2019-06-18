# snips-actions-runner
### A lightweight javascript actions runner.

## Purpose

The standard way to run Snips actions is to use the [`snips-skill-server`](https://docs.snips.ai/articles/console/actions/actions/code-your-action/action-specifications#specifications) binary that comes pre-installed with the Snips distribution.

The way the `skill-server` works is that it runs one process per-action.

It means that a `node.js` instance is spawned and bindings to the hermes library are created for each action.

**This is perfectly fine in mosts cases**, but when the number of actions to run is huge or if the environment is memory constrained it can become a problem.

This package is an attempt to mitigate these memory issues by running every javascript action using a single process.

## Setup

`npm i -g snips-actions-runner`

*It is recommended to create a daemon to launch the runner automatically, but this is beyond the scope of this file.*

## Specifications

### Root folder

By default the runner will look for actions in the `/var/lib/snips/skills` folder on Linux, or `/usr/local/var/snips/skills` on OSX.

For other oses, use the `-r` option to specify the root folder.

### Action

Each subfolder will then be scanned, and will be considered as an action **if and only if**:

1) It contains a `package.json` file.
2) The `package.json` file has a `dependency` field that contains the [`snips-toolkit`](https://github.com/snipsco/snips-javascript-toolkit) package.
3) The `package.json` file has a `main` field.

The file linked with the `main` field is then launched using a global `snips-toolkit` package ([in the same fashion as the run command](https://github.com/snipsco/snips-javascript-toolkit#snips-toolkit-run)).

## Usage

`snips-runner --help`


