#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const program = require('commander')
const chalk = require('chalk')
const runners = require('snips-toolkit-runner')

const MAX_CRASHES = 3
const CRASH_DELAY = 10000

const defaultRoot =
    [ 'darwin', 'mac' ].includes(process.platform) ?
        '/usr/local/var/snips/skills' :
    [
        'linux',
        'linux2',
        'sunos',
        'solaris',
        'freebsd',
        'openbsd',
    ].includes(process.platform) ?
        '/var/lib/snips/skills' :
    undefined

program
    .option('-r, --actions-root <path>', 'path to the folder containing actions', defaultRoot)
    .option('-c --config-path <path>', 'path to the configuration file')

program.parse(process.argv)

const { actionsRoot, configPath } = program

if(!actionsRoot || !fs.existsSync(actionsRoot)) {
    console.error(chalk.bold.red('!> Invalid path: ' + actionsRoot))
    process.exit(1)
}

if(configPath && !fs.existsSync(configPath)) {
    console.error(chalk.bold.red('!> Invalid configuration file path: '+ configPath))
    process.exit(1)
}

const actions = []
const crashCounters = new Map()

let config = {}
if(configPath) {
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch (error) {
        console.error(chalk.bold.red('!> Invalid configuration file format. Expected an utf-8 encoded JSON file.\n' + error.toString()))
        process.exit(1)
    }
}

fs.readdirSync(actionsRoot, { withFileTypes: true }).forEach(entry => {
    if(!entry.isDirectory())
        return
    try {
        const packageFilePath = path.resolve(actionsRoot, entry.name, 'package.json')
        if(!fs.existsSync(packageFilePath))
            return
        const { name, main, dependencies, devDependencies } = require(packageFilePath)
        const usesToolkit =
            dependencies && dependencies['snips-toolkit'] ||
            devDependencies && devDependencies['snips-toolkit']
        if(main && usesToolkit) {
            console.log(chalk.green.bold('Found action: "' + name + '".'))
            actions.push({
                name,
                main,
                root: path.resolve(actionsRoot, entry.name)
            })
        }
    } catch (error) {
        console.error(chalk.bold.red('!> Error while browsing '), chalk.bold.red(entry.name), chalk.red(error))
    }
})

async function runAction (action) {
    const { name, root: cwd, main } = action
    const target = path.resolve(cwd, main)
    console.log('Running action: "' + name + '"…')
    try {
        const done = await runners.sandboxedRunner({
            ...config,
            runnerOptions: {
                cwd,
                target
            }
        })
        action.done = done
    } catch (error) {
        console.error(chalk.bold.red('!> Error occured while running action "' + name + '"'), chalk.red(error))
    }
}

process.on('uncaughtException', (err) => {
    const action = actions.find(({ root }) => (
        err.stack.split('\n').some(line => line.includes(root))
    ))
    console.error(chalk.bold.red('!> Unhandled error occured while running action'+ (action && (' "' + action.name + '".') || '.')) + '\n', chalk.red(err))
    if(action) {
        if(typeof action.done === 'function') {
            action.done()
        }
        action.done = null
        let counter = 0
        if(!crashCounters.has(action.name)) {
            crashCounters.set(action.name, 1)
            setTimeout(() => {
                crashCounters.delete(action.name)
            }, CRASH_DELAY)
        } else {
            counter = crashCounters.get(action.name)
            crashCounters.set(action.name, counter + 1)
        }
        if(counter + 1 >= MAX_CRASHES) {
            console.error(chalk.bold.red(`!> Action "${action.name}"" crashed ${MAX_CRASHES} times in less than ${CRASH_DELAY / 1000} seconds, and will not be run again.`))
        } else {
            console.log(`Restarting action "${action.name}"…`)
            runAction(action)
        }
    }
})

process.on('unhandledRejection', (reason, p) => {
    console.log(chalk.bold.red('?> Unhandled Rejection at:'), chalk.bold.red(p), chalk.bold.red('reason:'), chalk.bold.red(reason))
})

actions.forEach(runAction)

