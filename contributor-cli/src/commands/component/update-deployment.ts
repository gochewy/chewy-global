import {Command, Flags} from '@oclif/core'
import {execSync} from 'node:child_process'
import * as fs from 'node:fs/promises'
import path = require('node:path')

export default class ComponentUpdateDeployment extends Command {
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
    const {args, flags} = await this.parse(ComponentUpdateDeployment)

    // cycle through /workspace/chewy-global/components and run the git subtree command
    const basePath = '/workspace/chewy-global/components'
    const repo = 'https://github.com/gochewy/component-deployment.git'
    const dirs = await fs.readdir(basePath, {withFileTypes: true})
    console.log('NOTE: We commit everything before updating...')
    const manualMergeDirs: string[] = []

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const fullPath = path.resolve(basePath, dir.name)

        console.info(`\nUpdating ${fullPath}...\n`)

        execSync('git add .', {
          cwd: fullPath,
        })

        try {
          execSync('git commit -am "Pre-update deployment."', {
            cwd: fullPath,
          })
        } catch (error: any) {
          // check if the error is because there's nothing to commit
          const output = error.output.toString()
          if (output.includes('nothing to commit')) {
            console.info('Nothing to commit.')
          } else {
            throw error
          }
        }

        try {
          execSync(`git subtree pull --prefix .chewy/deployment --squash ${repo} main`, {
            cwd: fullPath,
          })
        } catch (error: any) {
          const output = error.output.toString()
          if (output.includes('git subtree add')) {
            execSync(`git subtree add --prefix .chewy/deployment --squash ${repo} main`, {
              cwd: fullPath,
            })
          } else if (`${output}`.toLowerCase().includes('conflict')) {
            console.info(`There are conflicts in:\n\t${fullPath}\n Please resolve them and commit manually.`)
            manualMergeDirs.push(fullPath)
            continue
          } else {
            throw error
          }
        }

        try {
          // we do this because sometimes in GitPod the automatic
          // merge doesn't work, seemingly because it tries to open
          // an editor even when it shouldn't
          execSync('git commit -am "merged"', {
            cwd: fullPath,
          })
        } catch {}
      }
    }

    console.info('\nDone!\n')
    console.info('\nPlease resolve conflicts in:\n')
    for (const dir of manualMergeDirs) {
      console.info(`\t${dir}`)
    }
  }
}
