interface ErrorConstructor {
  captureStackTrace(thisArg: any, func: any): void
}

interface Result {
  word?: string
  function_label?: string
  pronunciation?: string
  etymology?: string
  definition?: string
}
