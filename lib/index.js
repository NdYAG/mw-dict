/*
   Nodejs Wrapper for [Merriam-Webster's Collegiate® Dictionary with Audio]'s API
   http://www.dictionaryapi.com/products/api-collegiate-dictionary.htm
   http://www.dictionaryapi.com/content/products/documentation/collegiate-tag-description.txt
*/

const axios = require('axios')
const { Parser } = require('xml2js')
const { promisify, inspect } = require('util')
const { isString, isPlainObject, isArray } = require('lodash')
const format = require('./format')

const COLLEGIATE_URL = 'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/'

const parser = new Parser({
  explicitArray: false
})
const parseAsync = promisify(parser.parseString)

function isNumeric(num) {
  // https://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
  return !isNaN(num)
}

function get_definition(texts = [], numbers = [], statuses = []) {
  // TODO: export markdown for <it> <bold> <sup> etc.
  // TODO: handle <un> usage note, <ca> called also
  texts = isArray(texts) ? texts : [texts]
  numbers = isArray(numbers) ? numbers : [numbers]
  statuses = isArray(statuses) ? statuses : [statuses]
  let senses = []
  let lastSense
  texts.forEach((def, i) => {
    let sense
    let number = numbers[i] || ''
    let status = statuses[i] || ''

    if (isString(def)) {
      sense = new Sense({
        status,
        meaning: def
      })
    }
    if (isPlainObject(def)) {
      let { _: meaning, sx: synonyms, vi: verbal_illustration, d_link, fw } = def
      // TODO: i_link, dx_ety
      if (d_link) {
        meaning = format(meaning, d_link)
      }
      // references
      // fw: abbreviation word expansion
      // here it is possible to treat fw as sx
      if (!synonyms) {
        synonyms = fw
      }
      sense = new Sense({
        status,
        meaning,
        verbal_illustration,
        synonyms
      })
    }

    if (isNumeric(number)) {
      sense.number = number
      senses.push(sense)
      lastSense = sense
    } else {
      // '1 a' or 'b' or { _: 'c ', snp: '(1)' }
      if (isPlainObject(number)) {
        let { _, snp } = number
        sense.number = snp
        if (_) { // { _: 'c': snp: '(1)' }
          let tempSense = new Sense({
            number: _
          })
          tempSense.addSense(sense)
          sense = tempSense
          lastSense.addSense(sense)
          lastSense = sense
        } else { // { snp: '(2)' }
          lastSense.addSense(sense)
        }
      }
      if (isString(number)) {
        let [main, sub] = number.split(' ')
        if (sub) { // '1 a'
          sense.number = sub
          let tempSense = new Sense({
            number: main
          })
          tempSense.addSense(sense)
          sense = tempSense
          lastSense = sense
          senses.push(sense)
        } else { // 'b'
          sense.number = main
          lastSense.addSense(sense)
        }
      }
    }
  })
  return senses
}

class Sense {
  constructor({ number, status, meaning, verbal_illustration, synonyms }) {
    this.number = this._normalizeSn(number)
    this.status = status
    this.meaning = this._normalizeDt(meaning)
    this.illustrations = this._normalizeVi(verbal_illustration)
    this.synonyms = this._normalizeSx(synonyms)
    this.senses = []
  }
  addSense(s) {
    this.senses.push(s)
  }
  _normalizeSn(number) {
    if (number) {
      return number.trim()
    }
  }
  _normalizeDt(meaning) {
    if (meaning) {
      return meaning.replace(/^(\s*):([^\s])/, (_, m1, m2) => `: ${m2}`)
    }
  }
  _normalizeSx(synonyms) {
    if (synonyms) {
      synonyms = isArray(synonyms) ? synonyms : [synonyms]
      let syns = synonyms.map((syn) => {
        if (isPlainObject(syn)) {
          return syn._
        } else {
          return syn
        }
      })
      return syns
    }
    return []
  }
  _normalizeVi(verbal_illustration) {
    if (verbal_illustration) {
      if (isPlainObject(verbal_illustration)) {
        verbal_illustration = [verbal_illustration]
      }
      return verbal_illustration.map(vi => {
        let { _: meaning, it: italic, aq: author_quoted } = vi
        let result = meaning
        if (author_quoted) {
          // TODO: check aq format
          // string, { it: string }, ???
          author_quoted = author_quoted.it || author_quoted
          result = `${meaning}— ${author_quoted}`
        }
        // TODO: check possible it format
        if (isArray(italic)) {
          italic = italic.join('')
        }
        result = format(result, italic)
        return `${result}`
      })
    }
    return []
  }
}

class WordNotFoundError extends Error {
  constructor(message, suggestion) {
    super(message)
    Error.captureStackTrace(this, WordNotFoundError)
    this.suggestion = suggestion
  }
}

class CollegiateDictionary {
  constructor(key) {
    this.key = key
  }
  lookup(word = '') {
    if (!isString(this.key)) {
      return Promise.reject(new Error('API key should be string.'))
    }
    const url = `${COLLEGIATE_URL}${word}?key=${this.key}`
    // TODO: throw error for word not found, invalid api key etc
    return axios.get(url)
      .then(resp => resp.data)
      .then(data => data.replace('<set>', '<dt>').replace('</set>', '</dt>')) // hack for <set>
      .then(parseAsync)
      .then(({ entry_list }) => {
        const { suggestion } = entry_list
        if (suggestion) {
          return Promise.reject(new WordNotFoundError('Word not found', suggestion))
        }
        let entries = isArray(entry_list.entry) ? entry_list.entry : [entry_list.entry]
        return entries.map((entry) => {
          const { ew: word, fl: functional_label, def } = entry
          return {
            word,
            functional_label,
            definition: get_definition(def.dt, def.sn, def.ssl)
          }
        })
      })
  }
}

module.exports = {
  WordNotFoundError,
  CollegiateDictionary
}
