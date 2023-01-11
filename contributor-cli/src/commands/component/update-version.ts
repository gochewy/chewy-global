import {Command, Flags} from '@oclif/core'
import jsyaml = require('js-yaml')
import {lstatSync, readFileSync, writeFileSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {findRoot} from '../../lib/context/find-root'
import {config} from '@gochewy/lib'

export default class ComponentsUpdateVersion extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    only: Flags.string({char: 'o', description: 'name of single component to update'}),
    // flag with no value (-f, --force)
    dependencies: Flags.boolean({char: 'd', description: 'update all dependencies from chewy to match this version'}),
  }

  static args = [{name: 'version', required: true}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ComponentsUpdateVersion)
    const version = args.version
    const {dependencies = false} = flags

    const root = await findRoot()
    const componentDir = resolve(root, 'components')
    const componentDirs = (
      await readdir(componentDir)
    ).filter(item => lstatSync(resolve(componentDir, item)).isDirectory()).map(item => resolve(componentDir, item))

    for (const dir of componentDirs) {
      const componentDefPath = resolve(dir, '.chewy', 'chewy-component.yml')
      try {
        const fileContents = readFileSync(componentDefPath, 'utf8')
        const def = jsyaml.load(fileContents) as config.component.ComponentDefinition
        def.version = version

        if (dependencies) {
          def.dependencies = def.dependencies?.map(dep => (
            dep.repository.includes('github.com/gochewy') ? ({
              ...dep,
              version,
            }) : dep
          ))
        }

        const newFileContents = jsyaml.dump(def)
        writeFileSync(componentDefPath, newFileContents)
      } catch {
        console.log('No component def found in', dir)
      }
    }
  }
}
