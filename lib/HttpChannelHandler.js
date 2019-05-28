const utils = require('./utils')

class HttpChannelHandler{
  constructor(pathPrefix) {
    this.pathPrefix = pathPrefix;
    if (this.pathPrefix === '/ws/client') {
      this.isClient = true;
    } else if (this.pathPrefix === '/ws/target') {
      this.isClient = false;
    } else {
      utils.pitch("invalid pathPrefix: " + this.pathPrefix)
    }

    this.isTarget = !this.isClient
  }

  handle(req, res, uri) {
    this.setCORSHeaders(req, res)
    this.setCacheHeaders(req, res)

    if (uri[0] !== '/') {
      return this.handleError(req, res, 404)
    }

    if (uri === '/') {
      if (req.method === 'OPTIONS') {
        return this.handleOptions(req, res);
      }
      if (req.method === 'POST') {
        return this.handleCreate(req, res);
      }
      return this.handleError(req, res, 405)
    }

    const parts = uri.split('/')

    if (parts.length > 2) {
      return this.handleError(req, res, 404)
    }

    const channelName = parts[1]

    if (req.method === 'OPTIONS') {
      return this.handleOptions(req, res);
    }
    if (req.method === 'GET') {
      return handleGet(req, res, channelName);
    }
    if (req.method === 'POST') {
      return handlePost(req, res, channelName);
    }
    return this.handleError(req, res, 405);
  }

  handleCreate(req, res) {
    const {connection, body} = req
    const id = body != null ? body.id : undefined
    const remoteAddress = (connection != null ? connection.remoteAddress : undefined) || ''
    const channel = new ChannelMergerNode(this.pathPrefix, id, remoteAddress, this.isClient)
    res.contentType('application/json')
    return res.send(JSON.stringify({
      id: channel.id,
      channel: channel.name
    }))
  }

  handleGet(req, res, channelName) {
    const { connection } = req

    const remoteAddress = (connection != null ? connection.remoteAddress : undefined) || ''

    const channel = channelManager.getChannel(channelName, remoteAddress)

    if (!channel) {
      return this.handleError(req, res, 404)
    }

    return channel.getMessages(() => messages => {
      if (channel.isClosed || !messages) return this.handleError(req, res, 404)

      res.contentType('application/json')
      return res.send(JSON.stringify(messages))
    })
  }

  handlePost(req, res, channelName) {
    const { connection } = req

    const remoteAddress = (connection != null ? connection.remoteAddress : undefined) || ''

    const channel = channelManager.getChannel(channelName, remoteAddress)

    if (!channel) {
      return this.handleError(req, res, 404)
    }
    
    return res.send('')
  }

  handleOptions(req, res) {
    return res.send('')
  }

  handleError(req, res, status) {
    return res.send(status)
  }

  setCORSHeaders(req, res) {
    const origin = req.header('Origin')

    if (!origin) return
    
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Max-Age', '600');
    return res.header('Access-Control-Allow-Methods', 'GET, POST');
  }

  setCacheHeaders(req, res) {
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Cache-Control', 'no-cache');
    return res.header('Cache-Control', 'no-store');
  }
}

module.exports = HttpChannelHandler