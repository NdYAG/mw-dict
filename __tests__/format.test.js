const format = require('../lib/format')

it('replaces leading whitespace with fragment', () => {
  expect(format(' b', 'a')).toBe('a b')
})

it('replaces trailing whitespace with fragment', () => {
  expect(format('a ', 'b')).toBe('a b')
})

it('inserts fragment between two continuous whitespaces', () => {
  expect(format('a  c', 'b')).toBe('a b c')
})

it('formats well when matches are more than fragments', () => {
  expect(format(' b  d ', ['a', 'c'])).toBe('a b c d')
})

it('place a verbal illustration at every occurrence of space + period', () => {
  let result = format('a . c .',
                      [],
                      [{ _: 'b' }, { _: 'd' }])
  expect(result).toBe('a. <b> c. <d>')
})
