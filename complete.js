const { isArray } = require('lodash')

function complete(meaning, fragments, illustrations) {
  /*
    (^)\s -> [fragment]\s
    \s($) -> \s[fragment]
    \s\s|\s\. -> \s[fragment][last_character]
  */
  let result = meaning
  if (fragments) {
    fragments = isArray(fragments)? fragments: [fragments]
    // TODO: are there \s; \s: etc ?
    result = result.replace(/^\s|\s$|\s\s|\s,/g, (match, pos) => {
      let fragment = fragments.shift()
      if (match.length === 1) {
        if (pos) { // \s$
          return ` ${fragment}`
        } else { // ^\s
          return `${fragment} `
        }
      } else {
        return ` ${fragment}${match[1]}`
      }
    })
  }
  if (illustrations) {
    illustrations = isArray(illustrations)? illustrations: [illustrations]
    result = result.replace(/\s\./g, (match) => {
      let illustration = illustrations.shift()
      illustration = complete(illustration._, illustration.it)
      return `. <${illustration}>`
    })
    result += illustrations.map((illustration) => {
      illustration = complete(illustration._, illustration.it)
      return ` <${illustration}>`
    })
  }
  return result
}

module.exports = complete
