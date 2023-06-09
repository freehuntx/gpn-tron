export const isStringValid = (string: string, minLength = 1) => {
  if (typeof string !== 'string') return false
  if (string.length < minLength) return false
  if (string.match(/.*\|.*/)) return false
  if (!/^[ -~]+$/.test(string)) return false
  return true
}

export const escapeString = (string: string) => {
  return string.replace(/(\||[^ -~])/g, '')
}
