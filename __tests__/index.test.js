const { CollegiateDictionary, WordNotFoundError } = require('../')

const dict = new CollegiateDictionary('')

describe('after fetching xml document from dictionaryapi.com', () => {
  it('parses <ew>, <fl>, and <def>', () => {
    return dict.lookup('TEST_ENTRY_KEY').then(results => {
      expect(Object.keys(results[0])).toEqual([
        'word',
        'functional_label',
        'definition'
      ])
    })
  })
})

describe('walking <def> node', () => {
  it('creates new Sense instance when it encounter <sn>', () => {
    return dict.lookup('TEST_DEF_SN').then(results => {
      let { definition } = results[0]
      expect(definition).toHaveLength(2)
    })
  })
  it('creates new Sense instances when <def> node has no <sn> but <dt>', () => {
    return dict.lookup('TEST_DEF_DT').then(results => {
      let { definition } = results[0]
      expect(definition).toHaveLength(1)
    })
  })
  it('combines <dt>, <sd>, <set> when any of them appear together before next <sn>', () => {
    return dict.lookup('TEST_DEF_MULTIPLE_DT').then(results => {
      let { definition } = results[0]
      let sense = definition[0]
      expect(sense.meanings).toHaveLength(2)
    })
  })
})

describe('walking <dt> node', () => {
  it('collects <sx> into synonyms', () => {
    return dict.lookup('TEST_DT').then(results => {
      let { definition } = results[0]
      let sense = definition[0]
      expect(sense.synonyms).toHaveLength(2)
    })
  })
  it('collects <vi> into illustrations', () => {
    return dict.lookup('TEST_DT').then(results => {
      let { definition } = results[0]
      let sense = definition[1]
      expect(sense.illustrations).toHaveLength(1)
    })
  })
})

describe('error handling', () => {
  it('throws error when word could not be found', () => {
    return dict.lookup('TEST_INEXIST').catch(e => {
      expect(e).toBeInstanceOf(WordNotFoundError)
      expect(e.suggestions).toBeInstanceOf(Array)
    })
  })
})
