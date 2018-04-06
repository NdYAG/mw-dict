const axios = require('axios')
const { DOMParser } = require('xmldom')
const { isString } = require('lodash')
const slice = Array.prototype.slice

const SOUND_URL = 'http://media.merriam-webster.com/soundc11'
const POPULARITY_URL =
  'https://stats.merriam-webster.com/pop-score-redesign.php'

class Sense {
  constructor({ number, transitivity, senses }) {
    if (number) {
      this.number = number
    }
    if (transitivity) {
      this.transitivity = transitivity
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
  addAntonym(s) {
    if (!this.antonyms) {
      this.antonyms = []
    }
    this.antonyms.push(s)
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
  constructor(suggestions) {
    super()
    Error.captureStackTrace(this, WordNotFoundError)
    this.suggestions = suggestions
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

function textContent(node, excludes = [], separator = '') {
  if (!node) {
    return ''
  }
  return slice
    .call(node.childNodes, 0)
    .filter(n => !excludes.includes(n.tagName))
    .map(n => n.textContent)
    .join(separator)
}

function getBulletType(bullet) {
  if (isNumeric(bullet)) {
    return 0
  }
  if (bullet.match(/^[a-z]$/)) {
    return 1
  }
  if (bullet.startsWith('(')) {
    return 2
  }
}

function pop(stack) {
  // only pop out the same type of number
  let list = []
  let type
  while (stack.length) {
    let s = stack.pop()
    type = type || getBulletType(s.number)
    if (getBulletType(s.number) === type) {
      list.push(s)
    } else {
      stack.push(s)
      break
    }
  }
  return list
}

function buildHierarchy(senses) {
  let stack = []
  for (let l = senses.length, i = l - 1; i >= 0; i--) {
    let sense = senses[i]
    let { number, meanings } = sense
    let matches
    if (!number) {
      if (meanings) {
        sense.senses = pop(stack)
      }
      continue
    }
    if (number.startsWith('(') || number.match(/^[a-z]$/)) {
      // '(2)' or 'b'
      stack.push(sense)
    }
    let bullets = number.split(' ')
    if (bullets.length === 1) {
      continue
    }
    // '1 a' or 'a (1)' or '1 a (1)'
    for (let l = bullets.length, j = l - 1; j >= 0; j--) {
      if (j === l - 1) {
        sense.number = bullets[j]
        stack.push(sense)
        continue
      }
      sense = new Sense({
        number: bullets[j],
        senses: pop(stack)
      })
      if (getBulletType(sense.number)) {
        stack.push(sense)
      } else {
        senses[i] = sense
      }
    }
  }
  return senses.filter(
    s => (s.number && isNumeric(s.number)) || (!s.number && s.meanings)
  )
}

function dtWalker(dtNode, sense) {
  let children = dtNode.childNodes
  let node = children[0]
  while (node) {
    switch (node.tagName) {
      case 'sx': {
        sense.addSynonym(textContent(node, (excludes = ['sxn'])))
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
  let transitivity
  while (node) {
    switch (node.tagName) {
      case 'sn': {
        sense = new Sense({
          number: node.textContent
        })
        if (node.textContent.match(/^\d/)) {
          sense.transitivity = transitivity
        }
        senses.push(sense)
        break
      }
      case 'ssl': {
        let status = textContent(node)
        sense.status = status
        break
      }
      case 'dt':
      case 'sd':
      case 'set': {
        if (!sense) {
          sense = new Sense({ transitivity })
          senses.push(sense)
        }
        sense.addMeaning(textContent(node, (excludes = ['sx', 'vi'])))
        dtWalker(node, sense)
        break
      }
      case 'vt': {
        transitivity = textContent(node)
        break
      }
      default:
        break
    }
    node = nextNode(node)
  }
  return buildHierarchy(senses)
}

function sensWalker(sensNode) {
  let sense = new Sense({})
  let node = sensNode.childNodes[0]
  while (node) {
    switch (node.nodeName) {
      case 'sn': {
        sense.number = textContent(node)
        break
      }
      case 'mc': {
        sense.addMeaning(textContent(node).trim())
        break
      }
      case 'vi': {
        sense.addIllustration(textContent(node))
        break
      }
      case 'syn': {
        textContent(node)
          .split(',')
          .forEach(s => {
            sense.addSynonym(s.trim())
          })
        break
      }
      case 'ant': {
        textContent(node)
          .split(',')
          .forEach(s => {
            sense.addAntonym(s.trim())
          })
        break
      }
      default:
        break
    }
    node = nextNode(node)
  }
  return sense
}

function soundWalker(soundNode) {
  if (!soundNode) {
    return []
  }
  let wav = soundNode.getElementsByTagName('wav')
  return slice.call(wav).map(w => {
    let filename = textContent(w)
    let matches = filename.match(/^[0-9]+|gg|bix/)
    let subdirectory
    if (matches) {
      subdirectory = matches[0]
    } else {
      subdirectory = filename[0]
    }
    return `${SOUND_URL}/${subdirectory}/${filename}`
  })
}

function etWalker(etNode) {
  if (!etNode) {
    return ''
  }
  let etymology = ''
  let children = etNode.childNodes
  let node = children[0]
  while (node) {
    switch (node.tagName) {
      case undefined: {
        etymology += ` ${node.textContent.trim()}`
        break
      }
      case 'it': {
        etymology += ` [${node.textContent.trim()}]`
        break
      }
      default:
        break
    }
    node = node.nextSibling
  }
  return etymology.trim()
}

function lookupPopularity(word) {
  let url = `${POPULARITY_URL}?word=${word}`
  return axios
    .get(url)
    .then(resp => resp.data)
    .then(s => {
      let label
      for (let line of s.split('\n')) {
        line = line.trim()
        if (line.startsWith('label')) {
          let matches = line.match(/'(.+)'/)
          if (matches) {
            label = matches[1]
            break
          }
        }
      }
      if (!label) {
        throw new Error('Popularity not found')
      }
      return label
    })
}

class BaseDictionary {
  constructor(key) {
    this.key = key
  }
  lookup(word = '') {
    if (!isString(this.key)) {
      return Promise.reject(new Error('API key should be string.'))
    }
    const url = `${this.url}${word}?key=${this.key}`
    const $popularity = lookupPopularity(word).catch(err => null)
    const $results = axios
      .get(url)
      .then(resp => resp.data)
      .then(s => new DOMParser().parseFromString(s))
      .then(doc => {
        let entries = doc.getElementsByTagName('entry')
        if (!entries.length) {
          let suggestions = doc.getElementsByTagName('suggestion')
          throw new WordNotFoundError(
            slice.call(suggestions).map(s => textContent(s))
          )
        }
        return slice.call(entries).map(entry => {
          return Object.assign(
            {
              word,
              functional_label: textContent(entry.getElementsByTagName('fl')[0])
            },
            this.process(entry)
          )
        })
      })
    return Promise.all([$popularity, $results]).then(
      ([popularity, results]) => {
        return results.map(result => {
          if (result.word === word) {
            return Object.assign(result, { popularity })
          }
          return result
        })
      }
    )
  }
}

class Dictionary extends BaseDictionary {
  process(entry) {
    let result = {
      pronunciation: soundWalker(entry.getElementsByTagName('sound')[0]),
      etymology: etWalker(entry.getElementsByTagName('et')[0]),
      definition: defWalker(entry.getElementsByTagName('def')[0])
    }
    let word = textContent(entry.getElementsByTagName('ew')[0])
    if (word.length) {
      Object.assign(result, {
        word
      })
    }
    return result
  }
}

class Thesaurus extends BaseDictionary {
  process(entry) {
    let result = {
      definition: slice
        .call(entry.childNodes, 0)
        .filter(child => child.nodeName === 'sens')
        .map(sensNode => sensWalker(sensNode))
    }
    let word = textContent(entry.getElementsByTagName('term')[0], [], ' ')
    if (word.length) {
      Object.assign(result, {
        word
      })
    }
    return result
  }
}

module.exports = {
  Dictionary,
  Thesaurus,
  WordNotFoundError
}
