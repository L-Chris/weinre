const fs = require('fs')
const net = require('net')
const dns = require('dns')
const path = require('path')
const express = require('express')
const utils = require('./utils')
const bodyParser = require('./bodyParser')
const HttpChannelHandler = require('./HttpChannelHandler')
const channelManager = require('./channelManager')
const serviceManager = require('./serviceManager')

let Version = null
const deathTimeout = null

const run = options => {
  options.httpPort = utils.ensureInteger(options.httpPort, 'the value of the option httpPort is not a number');
  options.boundHost = utils.ensureString(options.boundHost, 'the value of the option boundHost is not a string');
  options.verbose = utils.ensureBoolean(options.verbose, 'the value of the option verbose is not a boolean');
  options.debug = utils.ensureBoolean(options.debug, 'the value of the option debug is not a boolean');
  options.readTimeout = utils.ensureInteger(options.readTimeout, 'the value of the option readTimeout is not a number');
  options.deathTimeout = utils.ensureInteger(options.deathTimeout, 'the value of the option deathTimeout is not a number');

  if (options.debug) {
    options.verbose = true;
  }
  options.staticWebDir = getStaticWebDir();

  utils.logVerbose("pid:                 " + process.pid);
  utils.logVerbose("version:             " + (getVersion()));
  utils.logVerbose("node versions:");

  const nameLen = Object.keys(process.versions).reduce((pre, val) => {
    return Math.max(pre, val.length)
  }, 0)

  Object.entries(process.versions).forEach(([name, val]) => {
    utils.logVerbose(`   ${utils.alignLeft(name, nameLen)}: ${process.versions[name]}`)
  })

  utils.logVerbose("options:");
  utils.logVerbose("   httpPort:     " + options.httpPort);
  utils.logVerbose("   boundHost:    " + options.boundHost);
  utils.logVerbose("   verbose:      " + options.verbose);
  utils.logVerbose("   debug:        " + options.debug);
  utils.logVerbose("   readTimeout:  " + options.readTimeout);
  utils.logVerbose("   deathTimeout: " + options.deathTimeout);
  utils.setOptions(options);

  return checkHost(options.boundHost, err => {
    if (err) {
      utils.exit('unable to resolve boundHost address: ' + options.boundHost)
    }
    return _run()
  })
}

const _run = () => {
  const { options } = utils

  serviceManager.registerProxyClass('WeinreClientEvents')
  serviceManager.registerProxyClass('WeinreTargetEvents')
  serviceManager.registerLocalClass('WeinreClientCommands')
  serviceManager.registerLocalClass('WeinreTargetCommands')

  // 定时检查是否结束
  deathTimeout = utils.options.deathTimeout * 1000
  setInterval(checkForDeath, 1000)

  return startServer()
}

// 检查是否结束
const checkForDeath = timeout => {
  const now = Date.now()
  const _ref = channelManager.getChannels()
  const results = _ref.map(channel => {
    if (now - channel.lastRead > deathTimeout) return channel.close()
    return undefined
  })

  return results
}

const startServer = () => {
  const clientHandler = new HttpChannelHandler('/ws/client')
  const targetHandler = new HttpChannelHandler('/ws/target')
  channelManager.initialize()

  const {
    options: {
      staticWebDir,
      httpPort,
      boundHost
    }
  } = utils

  const favicon = `${staticWebDir}/images/weinre-icon-32×32.png`
  
  const app = express.createServer()

  app.on('error', error => {
    return utils.exit('error running server: ' + error)
  })
  app.use(express.favicon(favicon))
  app.use(bodyParser())

  app.all(/^\/ws\/client(.*)/, (req, res, next) => {
    let uri = req.params[0]
    if (uri === '') {
      uri = '/'
    }

    return clientHandler.handle(req, res, uri)
  })

  app.all(/^\/ws\/target(.*)/, (req, res, next) => {
    let uri = req.params[0]
    if (uri === '') {
      uri = '/'
    }

    return targetHandler.handle(req, res, uri)
  })

  app.use(express.errorHandler({
    dumpException: true
  }))

  app.use(express.staticCache({
    maxObjects: 500,
    maxLength: 32 * 1024 * 1024
  }))
  app.use(express.static(staticWebDir))

  if (boundHost === '-all-') {
    utils.log('starting server at http://localhost' + httpPort)
    return app.listen(httpPort)
  } else {
    utils.log(`starting server at http://${boundHost}:${httpPort}`)
    return app.listen(httpPort, boundHost)
  }
}

// 检查Host
const checkHost = (hostName, cb) => {
  if (hostName === '-all-') return cb()

  if (hostName === 'localhost') return cb()

  if (net.isIP(hostName)) return cb()

  return dns.lookup(hostName, cb)
}

// 获取库版本
const getVersion = () => {
  if (Version) return Version

  const packageJsonPath = path.join(path.dirname(fs.realpathSync(__filename)), '../package.json')
  const json = fs.readFileSync(packageJsonPath, 'utf8')
  const values = JSON.parse(json)
  Version = values.version
  return Version
}

// 获取web静态目录
const getStaticWebDir = () => {
  const webDir = path.normalize(path.join(__dirname, '../web'))
  if (fs.existsSync(webDir)) return webDir
  utils.exit('unable to find static files to serve in #{webDir}; did you do a build?')
}

exports.run = run
exports.getVersion = getVersion