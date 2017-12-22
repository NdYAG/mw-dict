/*
   Nodejs Wrapper for [Merriam-Webster's Collegiate® Dictionary with Audio]'s API
   http://www.dictionaryapi.com/products/api-collegiate-dictionary.htm
   http://www.dictionaryapi.com/content/products/documentation/collegiate-tag-description.txt
   https://www.dictionaryapi.com/info/faq-audio-image.htm

   ...And [Merriam-Webster's Learner's Dictionary with Audio]'s API
   https://dictionaryapi.com/products/api-learners-dictionary.htm
*/

const { Dictionary, WordNotFoundError } = require('./dictionary')

const COLLEGIATE_URL =
      'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/'
const LEARNERS_URL = 'https://www.dictionaryapi.com/api/v1/references/learners/xml/'

class CollegiateDictionary extends Dictionary {
  constructor(key) {
    super(key)
    this.url = COLLEGIATE_URL
  }
}

class LearnersDictionary extends Dictionary {
  constructor(key) {
    super(key)
    this.url = LEARNERS_URL
  }
}

module.exports = {
  WordNotFoundError,
  CollegiateDictionary,
  LearnersDictionary
}
