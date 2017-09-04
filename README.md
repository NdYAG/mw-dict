# mw-dict

**Node.js Wrapper for Merriam Webster Dictionary Developer API**

* exports word senses with hierarchy (sense, subsense...)
* cares about sense number, functional label, synonyms, verbal illustrations ...

Preview:

!['screen shot'](http://7d9o0k.com1.z0.glb.clouddn.com/mw_dict.png)

Note: Please get your API Key from [Merriam-Webster's Developer Center](http://www.dictionaryapi.com/)

## install

```shell
npm install mw-dict
```

## usage

```js
import { CollegiateDictionary } from 'mw-dict'

const dict = new CollegiateDictionary(API_KEY)

dict
  .lookup(QUERY_WORD)
  .then(result => {})
  .catch(error => {})
```

`result` format

```js
// result: Definition[]
// Definition
{
  word: String, 
  functional_label: String,
  definition: Sense[]
}
// Sense
{
  number: String,
  meanings: String[],
  synonyms: String[],
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



