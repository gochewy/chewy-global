import {Command} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

const doMergeBranch = async (path: string, branch: string) => {
  const result = await GitProcess.exec(['merge', branch], path)
  if (result.exitCode !== 0) {
    console.log('Something went wrong in ther merge...')
    throw new Error(result.stderr)
  }

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  console.log(`✅ Successfully merged ${chalk.bold.green(branch)} in ${chalk.bold.green(dirname)}.`)
}

export default class Checkout extends Command {
  static description = 'Merge a branch into the current branch.'

  static examples = [
    `
chewy-cc git merge 0.1.0
`,
  ]

  static flags = {}

  static args = [
    {
      name: 'branch',
      description: 'The branch to merge.',
    },
  ]

  async run(): Promise<void> {
    const rootPath = await findRoot()
    const currentBranch = (await GitProcess.exec(['branch', '--show-current'], rootPath)).stdout.replace('\n', '')

    const parsed = await this.parse(Checkout)
    const {args: {branch}} = parsed

    const mergeBranch = branch

    console.log(chalk.black.bgWhite('Current Branch:'), chalk.green.bold(currentBranch.replace('\n', '')))
    console.log('')
    console.log(chalk.black.bgWhite('Branch to merge:'), chalk.green.bold(mergeBranch))
    console.log('')

    const submodules = await findSubmodulePaths()

    await doMergeBranch(rootPath, mergeBranch)
    await Promise.all(submodules.map(path => doMergeBranch(path, mergeBranch)))

    console.log(`\nCongrats, you've merged ${chalk.green.bold(mergeBranch)} into ${chalk.green.bold(currentBranch)}`)
  }
}
