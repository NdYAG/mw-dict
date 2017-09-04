/*
   Nodejs Wrapper for [Merriam-Webster's Collegiate® Dictionary with Audio]'s API
   http://www.dictionaryapi.com/products/api-collegiate-dictionary.htm
   http://www.dictionaryapi.com/content/products/documentation/collegiate-tag-description.txt
*/

const axios = require('axios')
const { DOMParser } = require('xmldom')
const { isString } = require('lodash')
const format = require('./format')

const COLLEGIATE_URL = 'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/'

class Sense {
  constructor({ number, senses }) {
    if (number) {
      this.number = number
    }
    if (senses) {
      this.senses = senses
    }
  }
  addMeaning(s) {
    if (!this.meanings) {
      this.meanings = []
    }
    this.meanings.push(this._normalizeDt(s))
  }
  addSynonym(s) {
    if (!this.synonyms) {
      this.synonyms = []
    }
    this.synonyms.push(s)
  }
  addIllustration(s) {
    if (!this.illustrations) {
      this.illustrations = []
    }
    this.illustrations.push(s)
  }
  _normalizeDt(meaning) {
    if (meaning) {
      return meaning.replace(/^(\s*):([^\s])/, (_, m1, m2) => `: ${m2}`)
    }
  }
}

class WordNotFoundError extends Error {
  constructor(message, suggestion) {
    super(message)
    Error.captureStackTrace(this, WordNotFoundError)
    this.suggestion = suggestion
  }
}

function isNumeric(num) {
  // https://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
  return !isNaN(num)
}

function nextNode(node) {
  let next = node.nextSibling
  while (next && next.nodeType !== 1) {
    next = next.nextSibling
  }
  return next
}

function textContent(node, excludes = []) {
  if (!node) {
    return ''
  }
  return Array.prototype.slice.call(node.childNodes, 0)
    .filter(n => !excludes.includes(n.tagName))
    .map(n => n.textContent).join('')
}

function pop(stack) {
  // empty stack & create a new list
  let list = []
  while (stack.length) {
    list.push(stack.pop())
  }
  return list
}

function buildHierarchy(senses) {
  let stack = []
  for (let l = senses.length, i = l - 1; i >= 0; i--) {
    let sense = senses[i]
    let { number } = sense
    let matches
    if (!number) {
      continue
    }
    if (number.startsWith('(') || number.match(/^[a-z]$/)) { // '(2)' or 'b'
      stack.push(sense)
    }
    matches = number.match(/([a-z])\s(\(\d+\))/)
    if (matches) { // 'a (1)'
      sense.number = matches[2]
      stack.push(sense)
      let s = new Sense({
        number: matches[1],
        senses: pop(stack)
      })
      stack.push(s)
    }
    matches = number.match(/(\d+)\s([a-z]+)/)
    if (matches) { // '1 a'
      sense.number = matches[2]
      stack.push(sense)
      let s = new Sense({
        number: matches[1],
        senses: pop(stack)
      })
      senses[i] = s
    }
  }
  return senses.filter(s => !s.number || isNumeric(s.number))
}

function dtWalker(dtNode, sense) {
  let children = dtNode.childNodes
  let node = children[0]
  while (node) {
    switch (node.tagName) {
      case 'sx': {
        sense.addSynonym(textContent(node, excludes = ['sxn']))
        break
      }
      case 'vi': {
        sense.addIllustration(textContent(node))
        break
      }
      default:
        break
    }
    node = nextNode(node)
  }
}

function defWalker(defNode) {
  if (!defNode) {
    return []
  }
  let children = defNode.childNodes
  let node = children[0]
  let senses = []
  let sense
  while (node) {
    switch (node.tagName) {
      case 'sn': {
        sense = new Sense({
          number: node.textContent
        })
        senses.push(sense)
        break
      }
      case 'dt':
      case 'sd':
      case 'set': {
        if (!sense) {
          sense = new Sense({})
          senses.push(sense)
        }
        sense.addMeaning(textContent(node, excludes = ['sx', 'vi']))
        dtWalker(node, sense)
        break
      }
      default:
        break
    }
    node = nextNode(node)
  }
  return buildHierarchy(senses)
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
    // TODO: throw error for invalid api key etc
    return axios.get(url)
      .then(resp => resp.data)
      .then(s => new DOMParser().parseFromString(s))
      .then(doc => {
        let entries = doc.getElementsByTagName('entry')
        return Array.prototype.slice.call(entries).map(entry => {
          return {
            word: textContent(entry.getElementsByTagName('ew')[0]),
            functional_label: textContent(entry.getElementsByTagName('fl')[0]),
            definition: defWalker(entry.getElementsByTagName('def')[0])
          }
        })
      })
  }
}

module.exports = {
  WordNotFoundError,
  CollegiateDictionary
}
