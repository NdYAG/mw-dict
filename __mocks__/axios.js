const { parse } = require('url')
const { join } = require('path')
const { readFile } = require('fs')
const { promisify } = require('util')

const axios = jest.genMockFromModule('axios')
const readFileAsync = promisify(readFile)

axios.get = function(url) {
  let word = parse(url)
    .pathname.split('/')
    .pop()
  return readFileAsync(join(__dirname, `${word}.xml`), 'utf-8').then(data => {
    return {
      data
    }
  })
}

module.exports = axios
