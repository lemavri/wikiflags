'use strict'

var https = require('https'),
    path = require('path'),
    fs = require('fs')

var async = require('async'),
    mkdirp = require('mkdirp'),
    superagent = require('superagent')

var flags = require('./flags')

const types = ["FIFA", "IOC", "ISO3166_a3", "ISO3166_a2"],
      baseUrl = 'https://upload.wikimedia.org/wikipedia/commons/',
      uploadUrl = 'http://10.10.2.15:9000/upload/binary',
      storagePath = 'svg' // relative to current dir

if (process.argv.length <= 2) {
  handleExit("Please specify the type: " + types, 1)
}

let type = process.argv[2],
    uploadFlag = process.argv[3];

if (types.indexOf(type) === -1) { handleExit(type + " type not valid. Valid types: " + types, 1)}

if (uploadFlag) {
  if (['--upload', '-u'].indexOf(uploadFlag) === -1) { handleExit(uploadFlag + " flag not valid. Valid types: --upload, -u", 1)}
}

function handleExit(msg, code) {
  console.log(msg);
  return process.exit(1);
}

(function ensureStorage(storagePath) {
  mkdirp(path.join(__dirname, storagePath), (err) => {
    if (err) { handleExit("Error creating storage dir: " + err, 1) }
  })
})(storagePath);
// ALL GOOD! Let the fetch games begin.

fetchFlags(type);
/**
 * Type can be "FIFA", "IOC", "ISO3166_a3", "ISO3166_a2"
 */

function fetchFlags(type) {
  let filteredFlags = flags.filter( (flag) => { return !!flag[type] });

  async.each(filteredFlags, (flag, callback) => {
    fetchFlag(flag, (err, data) => {
      if (err) { return callback(err) }

      async.each([store, upload], (fn, fnCallback) => {
        fn(flag, data, fnCallback);
      }, (err) => {
        if (err) { return callback(err) }
      })
    })
  }, (err) => {
    if (err) { return handleExit("Error: " + err, 1)}

    handleExit("Done! Enjoy the flagging :)", 0)
  })
}

function fetchFlag(flag, cb) {
  https.get(baseUrl + flag.url, function(res) {
    let data = ''

    res.on('error', (err) => {
      cb(err)
    })

    res.on('data', (d) => {
      data += d
    })

    res.on('end', () => {
      cb(null, data)
    })
  })
}

function store(flag, data, cb) {
  fs.writeFile(path.join(storagePath, flag[type] + ".svg"), data, (err) => {
    cb(err)
  })
}

function upload(flag, data, cb) {
  if (!uploadFlag) { return cb() }

  superagent.post(uploadUrl)
    .send({
      filename: flag[type] + '.svg',
      path: 'nation_flag',
      data: data
    })
    .end((err, res) => {
      cb(err)
    })
}
