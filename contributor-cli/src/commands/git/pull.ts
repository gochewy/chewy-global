import {Command} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

interface PullOptions {
  branch: string;
}

const pull = async (path: string, {branch}: PullOptions) => {
  console.log('About to pull', path)
  const result = await GitProcess.exec(['pull', 'origin', branch], path)

  if (result.exitCode !== 0) {
    throw new Error(result.stderr)
  }

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  console.log(`✅ Successfully pulled ${chalk.bold.green(dirname)}`)
}

export default class Pull extends Command {
  static description =
    'Pull work on a given version (assumes everything has been properly committed)';

  static examples = [
    `
chewy-cc git pull
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    const rootPath = await findRoot()

    const branch = (
      await GitProcess.exec(['branch', '--show-current'], rootPath)
    ).stdout.replace('\n', '')

    const submodules = await findSubmodulePaths()

    await Promise.all(
      submodules.map(path => pull(path, {branch})),
    )
    await pull(rootPath, {branch})
  }
}
