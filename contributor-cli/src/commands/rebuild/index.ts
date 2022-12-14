import {Command} from '@oclif/core'
import {execSync} from 'node:child_process'
import {join} from 'node:path'
import {findRoot} from '../../lib/context/find-root'

export default class Rebuild extends Command {
    static description = 'Rebuild the contributor CLI. Optionally run `yarn build` in a sub-path.'

    static examples = [
      'chewy-cc rebuild',
      'chewy-cc rebuild cli',
    ]

    static args = [
      {
        name: 'path',
        description: 'The path to the component to rebuild.',
      },
    ]

    async run(): Promise<any> {
      const {args} = await this.parse(Rebuild)
      console.log('@@ args:', args)
      const path = args?.path || 'contributor-cli'
      const cwd = join((await findRoot()), path)
      console.log('@@ cwd:', cwd)
      execSync('yarn build', {cwd})
    }
}
