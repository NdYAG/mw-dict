# mw-dict

**Node.js Wrapper for Merriam Webster Dictionary Developer API**

* Supports **Collegiate® Dictionary** & **Learner's Dictionary**
* Supports **Collegiate® Thesaurus**
* Exports word senses with hierarchy (sense, subsense...)
* Outputs pronunciation audio url
* Cares about functional label, synonyms, verbal illustrations ...
* Outputs popularity

Preview:

!['screen shot'](http://7d9o0k.com1.z0.glb.clouddn.com/mw_dict.png)

Note: Please get your API Key from [Merriam-Webster's Developer Center](http://www.dictionaryapi.com/)

## install

```shell
npm install mw-dict
```

## usage

```js
import { CollegiateDictionary, LearnersDictionary, CollegiateThesaurus } from 'mw-dict'

const dict = new CollegiateDictionary(API_KEY)
// const dict = new LearnersDictionary(API_KEY)
// const thesaurus = new CollegiateThesaurus(API_KEY)

dict
  .lookup(QUERY_WORD)
  .then(result => {})
  .catch(error => {})
```

`result` interface

```js
// result: Definition[]
// Definition
{
  word: String,
  functional_label: String,
  pronunciation: String[],
  definition: Sense[],
  popularity: String
}
// Sense
{
  number: String,
  meanings: String[],
  synonyms: String[],
  antonyms: String[],
  illustrations: String[],
  senses: Sense[]
}
```

Error handler

```js
import { WordNotFoundError } from 'mw-dict'

dict
  .lookup(QUERY_WORD)
  .catch(error => {
    if (error instanceof WordNotFoundError) {
      // error.suggestion
    }
  })
```



