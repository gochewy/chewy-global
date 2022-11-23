import {Command, Flags} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

interface CommitOptions {
  message: string;
  all: boolean;
}

const commit = async (path: string, {message, all}: CommitOptions) => {
  console.log('About to commit', path)

  if (all) {
    await GitProcess.exec(['add', '.'], path)
  }

  const result = await GitProcess.exec(['commit', '-m', message], path)

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  if (result.exitCode === 0) {
    console.log(`✅ Successfully committed ${chalk.bold.green(dirname)}`)
  } else if (result.stdout.includes('nothing to commit')) {
    console.log(`⚠️ Nothing to commit in ${chalk.bold.green(dirname)}`)
  } else {
    throw new Error(result.stderr)
  }
}

export default class Commit extends Command {
  static description =
    'Commit current work across all submodules.';

  static examples = [
    `
chewy-cc git commit --all
`,
  ];

  static flags = {
    all: Flags.boolean({
      char: 'A',
      default: false,
      description: 'Stage all changes before committing.',
    }),
  };

  static args = [
    {
      name: 'message',
      description: 'A commit message.',
      required: true,
    },
  ];

  async run(): Promise<void> {
    const parsed = await this.parse(Commit)
    const {
      flags: {all = false},
      args,
    } = parsed
    const message = args[0] as string

    const rootPath = await findRoot()

    const submodules = await findSubmodulePaths()

    await Promise.all(
      submodules.map(path => commit(path, {message, all})),
    )
    await commit(rootPath, {message, all})
  }
}
