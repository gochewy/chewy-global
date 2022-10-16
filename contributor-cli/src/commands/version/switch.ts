import {Command} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

const switchToNewBranch = async (path: string, branch: string) => {
  const result = await GitProcess.exec(['checkout', '-b', branch], path)
  if (result.exitCode !== 0) {
    const errorLowercase = result.stderr.toLowerCase()
    const preExistsErrorLowercase = `a branch named '${branch}' already exists`.toLowerCase()

    if (errorLowercase.includes(preExistsErrorLowercase)) {
      const result2 = await GitProcess.exec(['checkout', branch], path)
      if (result2.exitCode !== 0) {
        throw new Error(result2.stderr)
      }
    } else {
      throw new Error(result.stderr)
    }
  }

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  console.log(`✅ Successfully switched ${chalk.bold.green(dirname)} to ${chalk.bold.green(branch)}`)
}

export default class Switch extends Command {
  static description = 'Switch to work on a given version'

  static examples = [
    `
chewy-cc version switch v0.1.0
`,
  ]

  static flags = {}

  static args = [
    {
      name: 'version',
      description: 'The Chewy version you would like to work on.',
      required: true,
    },
  ]

  async run(): Promise<void> {
    const parsed = await this.parse(Switch)
    const {args: {version}} = parsed

    const rootPath = await findRoot()

    const currentBranch = (await GitProcess.exec(['branch', '--show-current'], rootPath)).stdout

    const newBranch = version === 'main' ? version : `${version}-branch`

    console.log(chalk.black.bgWhite('Current Branch:'), chalk.green.bold(currentBranch.replace('\n', '')))
    console.log('')
    console.log(chalk.black.bgWhite('New Branch:'), chalk.green.bold(newBranch))
    console.log('')

    const submodules = await findSubmodulePaths()

    await switchToNewBranch(rootPath, newBranch)
    await Promise.all(submodules.map(path => switchToNewBranch(path, newBranch)))

    console.log(`\nCongrats, you're now working on version ${chalk.green.bold(version)} of Chewy! Let's make it a good one 😊🐆`)
  }
}
