export const slice = Array.prototype.slice

export function isNumeric(num) {
  // https://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
  return !isNaN(num)
}

export function nextNode(node) {
  let next = node.nextSibling
  while (next && next.nodeType !== 1) {
    next = next.nextSibling
  }
  return next
}

export function textContent(
  node,
  excludes: Array<string> = [],
  separator = ''
) {
  if (!node) {
    return ''
  }
  return slice
    .call(node.childNodes, 0)
    .filter(n => !excludes.includes(n.tagName))
    .map(n => n.textContent)
    .join(separator)
}
