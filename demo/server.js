const micro = require('micro')
const { inspect } = require('util')
const { parse: parseURL } = require('url')

const { CollegiateDictionary, LearnersDictionary } = require('../')
const { LEARNERS: LEARNERS_API_KEY, COLLEGIATE: COLLEGIATE_API_KAY } = require('./config')
const collegiateDict = new CollegiateDictionary(key = COLLEGIATE_API_KAY)
const learnersDict = new LearnersDictionary(key = LEARNERS_API_KEY)

function renderDefinition(senses) {
  return senses
    .map(
      ({ number, meanings, synonyms, illustrations, senses }) => `
<li>
    ${number ? '<strong>' + number + '</strong>' : ''}
    ${meanings && meanings.length ? meanings.join(' ') : ''}
    ${synonyms && synonyms.length
      ? synonyms.map(s => '<a>' + s + '</a>').join(', ')
      : ''}
    ${illustrations && illustrations.length
      ? '<ul>' +
        illustrations.map(i => '<li>' + i + '</li>').join('\n') +
        '</ul>'
      : ''}
    ${senses && senses.length
      ? '<ol>' + renderDefinition(senses) + '</ol>'
      : ''}
</li>
    `
    )
    .join('\n')
}

function render(definitions) {
  return definitions
    .map(
      ({ word, functional_label, definition }) => `
<h2>${word}</h2>
<p><i>${functional_label}</i><p>
<ol>
  ${renderDefinition(definition)}
</ol>
    `
    )
    .join('\n')
}

const server = micro(async (req, res) => {
  let url = parseURL(req.url, true)
  let matches = url.pathname.match(/\/word\/(.*)/)
  let dict = url.query.type === 'learners'? learnersDict: collegiateDict
  if (matches) {
    let word = matches[1]
    const definitions = await dict.lookup(word)
    res.setHeader('Content-Type', 'text/html')
    let extra = `<style>body {font-family: Garamond Premier Pro; font-size: 1.3rem; line-height: 1.35; padding: 2rem;} a {color: blue; text-decoration: none;} ol, ul {list-style: none;} li + li, li > ul {margin-top: .8rem;} ul li:before{content: '•'; color:#5690b1; margin-right: .5rem;}</style>`
    return extra + render(definitions)
  }
  return ''
})

server.listen(3000)
