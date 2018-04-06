/*
   Nodejs Wrapper for [Merriam-Webster's Collegiate® Dictionary with Audio]'s API
   http://www.dictionaryapi.com/products/api-collegiate-dictionary.htm
   http://www.dictionaryapi.com/content/products/documentation/collegiate-tag-description.txt
   https://www.dictionaryapi.com/info/faq-audio-image.htm

   ...And [Merriam-Webster's Learner's Dictionary with Audio]'s API
   https://dictionaryapi.com/products/api-learners-dictionary.htm

   ...And [Merriam-Webster's Collegiate® Thesaurus]'s API
   https://www.dictionaryapi.com/content/products/documentation/thesaurus-tag-description.txt
   https://www.dictionaryapi.com/content/products/documentation/intermediate-thesaurus-tag-description.txt
*/

const { Dictionary, Thesaurus, WordNotFoundError } = require('./dictionary')

const COLLEGIATE_DICT_URL =
  'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/'
const LEARNERS_DICT_URL =
  'https://www.dictionaryapi.com/api/v1/references/learners/xml/'
const COLLEGIATE_THESAURUS_URL =
  'https://www.dictionaryapi.com/api/v1/references/thesaurus/xml/'

class CollegiateDictionary extends Dictionary {
  constructor(key) {
    super(key)
    this.url = COLLEGIATE_DICT_URL
  }
}

class LearnersDictionary extends Dictionary {
  constructor(key) {
    super(key)
    this.url = LEARNERS_DICT_URL
  }
}

class CollegiateThesaurus extends Thesaurus {
  constructor(key) {
    super(key)
    this.url = COLLEGIATE_THESAURUS_URL
  }
}

module.exports = {
  WordNotFoundError,
  CollegiateDictionary,
  LearnersDictionary,
  CollegiateThesaurus
}
