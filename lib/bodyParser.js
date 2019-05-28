module.exports = function(options) {
  return (req, res, next) => {
    
    if (req.body) return next()

    req.body = {}
    if (req.method !== 'POST') return next()
    req.setEncoding('utf8')
    let buffer = ''
    
    req.on('data', chunk => {
      return buffer += chunk
    })

    req.on('end', () => {
      if (buffer === '') return next()

      try {
        req.body = JSON.parse(buffer)
        return next()
      } catch(error) {
        return next(error)
      }
    })
  }
}