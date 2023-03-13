import {expect, test} from '@oclif/test'

describe('component/update-deployment', () => {
  test
  .stdout()
  .command(['component/update-deployment'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['component/update-deployment', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
