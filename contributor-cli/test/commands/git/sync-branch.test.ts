import {expect, test} from '@oclif/test'

describe('git/sync-branch', () => {
  test
  .stdout()
  .command(['git/sync-branch'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['git/sync-branch', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
