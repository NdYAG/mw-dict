export default class Sense {
  number: string
  transitivity: string
  senses: Array<Sense>
  meanings: Array<string>
  synonyms: Array<string>
  antonyms: Array<string>
  illustrations: Array<string>
  constructor(number?: string, transitivity?: string, senses?: Array<Sense>) {
    if (number) {
      this.number = number
    }
    if (transitivity) {
      this.transitivity = transitivity
    }
    if (senses) {
      this.senses = senses
    }
  }
  addMeaning(s) {
    if (!this.meanings) {
      this.meanings = []
    }
    this.meanings.push(this.normalizeDt(s))
  }
  addSynonym(s) {
    if (!this.synonyms) {
      this.synonyms = []
    }
    this.synonyms.push(s)
  }
  addAntonym(s) {
    if (!this.antonyms) {
      this.antonyms = []
    }
    this.antonyms.push(s)
  }
  addIllustration(s) {
    if (!this.illustrations) {
      this.illustrations = []
    }
    this.illustrations.push(s)
  }
  private normalizeDt(meaning) {
    if (meaning) {
      return meaning.replace(/^(\s*):([^\s])/, (_, m1, m2) => `: ${m2}`)
    }
  }
}
