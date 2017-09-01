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

function get_definition(texts=[], numbers=[], statuses=[]) {
  // TODO: add sn(sense number)
  // TODO: export markdown for <it> <bold> <sup> etc.
  // TODO: handle <un> usage note, <ca> called also
  texts = isArray(texts)? texts: [texts]
  numbers = isArray(numbers)? numbers: [numbers]
  statuses = isArray(statuses)? statuses: [statuses]
  return texts.map((def, i) => {
    let sense_number = numbers[i] || ''
    let status = statuses[i] || ''
    if (isString(def)) {
      // return `${sense_number}${def}`
      return new Definition({
        sense_number,
        status,
        meaning: def
      }).format()
    }
    if (isPlainObject(def)) {
      let { _: meaning, sx: synonymous, vi: verbal_illustration, d_link, fw } = def
      // TODO: i_link, dx_ety
      if (d_link) {
        meaning = complete(meaning, d_link)
      }
      // references
      if (!synonymous) {
        synonymous = fw // fw: abbreviation word expansion
      }
      return new Definition({
        sense_number,
        status,
        meaning,
        verbal_illustration,
        synonymous
      }).format()
    }
  })
}

class Definition {
  constructor({sense_number, status, meaning, verbal_illustration, synonymous}) {
    this.sense_number = sense_number
    this.status = status
    this.meaning = meaning
    this.verbal_illustration = verbal_illustration
    this.synonymous = synonymous
  }
  _normalizeSn(sense_number) {
    if (sense_number) {
      if (isString(sense_number)) {
        return sense_number
      }
      if (isPlainObject) {
        // TODO: handle <snp> etc.
      }
      console.log(sense_number)
    }
    return ''
  }
  _normalizeSsl(status) {
    if (status) {
      return `[${status}]`
    }
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
  _normalizeDt(meaning) {
    return meaning.replace(/^(\s*):([^\s])/, (_, m1, m2) => `: ${m2}`)
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
            this._normalizeSsl(this.status),
            this._normalizeDt(this.meaning),
            this._normalizeSx(this.synonymous),
            this._normalizeVi(this.verbal_illustration)
           ]
      .map(s => s.trim())
      .filter(s => !!s.length)
      .join(' ')
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
        console.log(inspect(entry_list, false, null))
        let entries = isArray(entry_list.entry)? entry_list.entry: [entry_list.entry]
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
  CollegiateDictionary
}
