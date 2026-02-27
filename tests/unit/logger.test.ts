import { logger } from '../../src/utils/logger'

describe('logger', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.env = originalEnv
  })

  it('does nothing when LOG_LEVEL is silent', () => {
    process.env.LOG_LEVEL = 'silent'

    logger.info('msg')

    expect(console.log).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('logs info using console.log', () => {
    logger.info('hello', { id: 1 })
    expect(console.log).toHaveBeenCalled()
  })

  it('logs warn using console.log', () => {
    logger.warn('warning')
    expect(console.log).toHaveBeenCalled()
  })

  it('logs debug using console.log', () => {
    process.env.LOG_LEVEL = 'debug' 
    logger.debug('debug')
    expect(console.log).toHaveBeenCalled()
  })

  it('logs error using console.error', () => {
    logger.error('fail')
    expect(console.error).toHaveBeenCalled()
  })

  it('handles circular meta safely', () => {
    process.env.LOG_LEVEL = 'debug'

    const circular: any = {}
    circular.self = circular

    logger.info('test', circular)

    expect(console.log).toHaveBeenCalled()
  })
})