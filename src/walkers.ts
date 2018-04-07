import Sense from './Sense'
import { slice, isNumeric, nextNode, textContent } from './utils'

const SOUND_URL = 'http://media.merriam-webster.com/soundc11'

enum BULLET {
  LEVEL_0 = 0,
  LEVEL_1 = 1,
  LEVEL_2 = 2
}

function getBulletType(bullet) {
  if (isNumeric(bullet)) {
    return BULLET.LEVEL_0
  }
  if (bullet.match(/^[a-z]$/)) {
    return BULLET.LEVEL_1
  }
  if (bullet.startsWith('(')) {
    return BULLET.LEVEL_2
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

export function buildHierarchy(senses) {
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
      sense = new Sense(bullets[j], null, pop(stack))
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

export function dtWalker(dtNode, sense) {
  let children = dtNode.childNodes
  let node = children[0]
  while (node) {
    switch (node.tagName) {
      case 'sx': {
        sense.addSynonym(textContent(node, ['sxn']))
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

export function defWalker(defNode) {
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
        sense = new Sense(node.textContent)
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
          sense = new Sense(null, transitivity)
          senses.push(sense)
        }
        sense.addMeaning(textContent(node, ['sx', 'vi']))
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

export function sensWalker(sensNode) {
  let sense = new Sense()
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

export function soundWalker(soundNode) {
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

export function etWalker(etNode) {
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
