import axios from 'axios'
import { DOMParser } from 'xmldom'
import { isString } from 'lodash'
import { soundWalker, etWalker, defWalker, sensWalker } from './walkers'
import { slice, textContent } from './utils'

const POPULARITY_URL =
  'https://stats.merriam-webster.com/pop-score-redesign.php'

export class WordNotFoundError extends Error {
  suggestions: Array<string>
  constructor(suggestions) {
    super()
    Error.captureStackTrace(this, WordNotFoundError)
    this.suggestions = suggestions
  }
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

abstract class BaseDictionary {
  public url: string
  constructor(public key: string) {}
  abstract process(entry: any): Result
  public lookup(word: string = ''): Promise<Array<object>> {
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
          return {
            word,
            functional_label: textContent(entry.getElementsByTagName('fl')[0]),
            ...this.process(entry)
          }
        })
      })
    return Promise.all([$popularity, $results]).then(
      ([popularity, results]) => {
        return results.map(result => {
          if (result.word === word) {
            return {
              ...result,
              popularity
            }
          }
          return result
        })
      }
    )
  }
}

export class Dictionary extends BaseDictionary {
  process(entry) {
    let result: Result = {
      pronunciation: soundWalker(entry.getElementsByTagName('sound')[0]),
      etymology: etWalker(entry.getElementsByTagName('et')[0]),
      definition: defWalker(entry.getElementsByTagName('def')[0])
    }
    let word = textContent(entry.getElementsByTagName('ew')[0])
    if (word.length) {
      result = {
        ...result,
        word
      }
    }
    return result
  }
}

export class Thesaurus extends BaseDictionary {
  process(entry) {
    let result: Result = {
      definition: slice
        .call(entry.childNodes, 0)
        .filter(child => child.nodeName === 'sens')
        .map(sensNode => sensWalker(sensNode))
    }
    let word = textContent(entry.getElementsByTagName('term')[0], [], ' ')
    if (word.length) {
      result = {
        ...result,
        word
      }
    }
    return result
  }
}
