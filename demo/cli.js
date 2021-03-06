/*
  Exmaples:
  node demo/cli.js path
  node demo/cli.js 'glide path'
 */

const { inspect } = require('util')
const { CollegiateDictionary } = require('../')
const API_KEY = require('./config').COLLEGIATE

const dict = new CollegiateDictionary((key = API_KEY))

let argv = process.argv
let word = argv[argv.length - 1]

dict
  .lookup(word)
  .then(result => {
    console.log(inspect(result, false, null))
  })
  .catch(err => {
    console.log(err)
  })
