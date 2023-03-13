import {Command, Flags} from '@oclif/core'
import {execSync} from 'node:child_process'
import * as fs from 'node:fs/promises'
import path = require('node:path')

export default class ComponentUpdateCommands extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ComponentUpdateCommands)

    // cycle through /workspace/chewy-global/components and run the git subtree command
    const basePath = '/workspace/chewy-global/components'
    const repo = 'https://github.com/gochewy/component-commands.git'
    const dirs = await fs.readdir(basePath, {withFileTypes: true})
    console.log('NOTE: We commit everything before updating...')
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const fullPath = path.resolve(basePath, dir.name)
        execSync('git add . && git commit -am "chore: pre update commands"')
        execSync(`git subtree pull --prefix=${fullPath}/.chewy/commands ${repo} main`)
      }
    }
  }
}
