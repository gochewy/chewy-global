import {expect, test} from '@oclif/test'

describe('component update-version', () => {
  test
  .stdout()
  .command(['component update-version'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['component update-version', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
