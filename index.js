/* Nodejs Wrapper for [Merriam-Webster's Collegiate® Dictionary with Audio]'s API
   http://www.dictionaryapi.com/products/api-collegiate-dictionary.htm
   http://www.dictionaryapi.com/content/products/documentation/collegiate-tag-description.txt
*/

const axios = require('axios')
const { Parser } = require('xml2js')
const { promisify, inspect } = require('util')
const { isString, isPlainObject, isArray } = require('lodash')
const complete = require('./complete')

const COLLEGIATE_URL = 'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/'

const parser = new Parser({ explicitArray: false })
const parseAsync = promisify(parser.parseString)

function get_definition(defs, numbers) {
  // TODO: add sn(sense number)
  // TODO: export markdown for <it> <bold> <sup> etc.
  // TODO: handle <un> usage note, <ca> called also
  defs = isArray(defs)? defs: [defs]
  numbers = isArray(numbers)? numbers: [numbers]
  return defs.map((def, i) => {
    let sense_number = numbers[i]
    if (isString(def)) {
      return `${sense_number}${def}`
    }
    if (isPlainObject(def)) {
      let { _: meaning, sx: synonymous, vi: verbal_illustration, d_link } = def
      // TODO: i_link, dx_ety
      if (d_link) {
        meaning = complete(meaning, d_link)
      }
      return new Definition({
        sense_number,
        meaning,
        verbal_illustration,
        synonymous
      })
    }
  })
}

class Definition {
  constructor({sense_number, meaning, verbal_illustration, synonymous}) {
    this.sense_number = sense_number
    this.meaning = meaning
    this.verbal_illustration = verbal_illustration
    this.synonymous = synonymous
  }
  _normalizeSn(sense_number) {
    return ''
  }
  _normalizeSx(synonymous) {
    if (synonymous) {
      synonymous = isArray(synonymous)? synonymous: [synonymous]
      let syns = synonymous.map((syn) => {
        if (isPlainObject(syn)) {
          return syn._
        } else {
          return syn
        }
      })
      return syns.join(', ')
    }
    return ''
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
        result = complete(result, italic)
        return `<${result}>`
      }).join(' ')
    }
    return ''
  }
  format() {
    return [this._normalizeSn(this.sense_number),
            this.meaning,
            this._normalizeVi(this.verbal_illustration),
            this._normalizeSn(this.synonymous)].join('')
  }
}

class CollegiateDictionary {
  constructor(key) {
    this.key = key
  }
  lookup(word='') {
    if (!isString(this.key)) {
      return Promise.reject(new Error('API key should be string.'))
    }
    const url = `${COLLEGIATE_URL}${word}?key=${this.key}`
    // TODO: throw error for word not found, invalid api key etc
    return axios.get(url)
      .then(resp => resp.data)
      .then(parseAsync)
      .then(({entry_list}) => {
        let entries = isArray(entry_list.entry)? entry_list.entry: [entry_list.entry]
        return entries.map((entry) => {
          const { ew: word, fl: functional_label, def, sn } = entry
          return {
            word,
            functional_label,
            definition: get_definition(def, sn)
          }
        })
      })
  }
}

module.exports = {
  CollegiateDictionary
}
