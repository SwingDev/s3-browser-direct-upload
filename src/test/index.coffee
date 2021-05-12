# s3-browser-direct-upload
_           = require('lodash')
fs          = require('fs')
moment      = require('moment')

chai        = require('chai')
path        = require('path')
sinon       = require('sinon')
sinonChai   = require('sinon-chai')

assert    = chai.assert
expect    = chai.expect

chai.use(sinonChai)
s3BrowserUpload = require('../lib')


# TESTS
describe 's3-uploadPostForm tests', () ->
  runTests = (asEnvironmentVar) ->
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    accessKeyId = 'rHiziprP5FLOL5DpLaRc'
    secretAccessKey = 'dGudXJxDvtgZ2oRvzuMY1uWA/tsziUXwkd3tnJBk'
    testNameSuffix = ' without env'

    if asEnvironmentVar
      process.env.AWS_ACCESS_KEY_ID = accessKeyId
      process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey
      accessKeyId = ''
      secretAccessKey = ''
      testNameSuffix = ' with env'

    describe '#uploadPostForm tests' + testNameSuffix , () ->

      s3client = null

      before ->
        s3client = new s3BrowserUpload
          accessKeyId: accessKeyId
          secretAccessKey: secretAccessKey
          signatureVersion: "v4"
          region: "eu-central-1"

      it 'should return json with all parameters required to build a form', (done) ->
        uploadPostFormOptions =
          key: "testKey.jpg"
          bucket: 'testBucket'
          expires: moment().add(60, 'minutes').toDate()
          extension: 'jpg'

        s3client.uploadPostForm uploadPostFormOptions, (err, params) ->
          expect(params).to.have.deep.property 'params.key'
          expect(params).to.have.deep.property 'params.acl'
          expect(params).to.have.deep.property 'params.content-type'
          expect(params).to.have.deep.property 'params.x-amz-algorithm'
          expect(params).to.have.deep.property 'params.x-amz-credential'
          expect(params).to.have.deep.property 'params.x-amz-date'
          expect(params).to.have.deep.property 'params.policy'
          expect(params).to.have.deep.property 'params.x-amz-signature'
          expect(params).to.have.deep.property 'public_url'
          expect(params).to.have.deep.property 'form_url'
          expect(params).to.not.have.deep.property 'conditions'

          done()

      it 'should return json with all parameters required to build a form if custom conditionMatching used', (done) ->
        uploadPostFormOptions =
          key: "testKey.jpg"
          bucket: 'testBucket'
          expires: moment().add(60, 'minutes').toDate()
          extension: 'jpg'
          conditionMatching: [
            {"success_action_redirect": "http://google.com"}
          ]

        s3client.uploadPostForm uploadPostFormOptions, (err, params) ->
          expect(params).to.have.deep.property 'params.key'
          expect(params).to.have.deep.property 'params.acl'
          expect(params).to.have.deep.property 'params.content-type'
          expect(params).to.have.deep.property 'params.x-amz-algorithm'
          expect(params).to.have.deep.property 'params.x-amz-credential'
          expect(params).to.have.deep.property 'params.x-amz-date'
          expect(params).to.have.deep.property 'params.policy'
          expect(params).to.have.deep.property 'params.x-amz-signature'
          expect(params).to.have.deep.property 'public_url'
          expect(params).to.have.deep.property 'form_url'
          expect(params).to.have.deep.property 'conditions'

          done()

    describe '#upload tests' + testNameSuffix, () ->

      s3client = null

      before ->
        s3client = new s3BrowserUpload
          accessKeyId: accessKeyId
          secretAccessKey: secretAccessKey
          signatureVersion: "v4"
          region: "eu-central-1"

        sinon.stub s3client.s3, 'upload', (params, cb) ->
          cb()

      after ->
        s3client.s3.upload.restore()

      it 'should return url of uploaded file', (done) ->
        uploadOptions =
          data: "String Object data"
          key: "testKey.txt"
          bucket: 'testBucket'
          extension: 'txt'
          acl: 'public-read'

        s3client.upload uploadOptions, (err, url) ->
          expect(url).to.exists
          expect(url).to.equal 'https://testBucket.s3.amazonaws.com/testKey.txt'
          done()

    describe '#put tests' + testNameSuffix, () ->

      s3client = null

      before ->
        s3client = new s3BrowserUpload
          accessKeyId: accessKeyId
          secretAccessKey: secretAccessKey
          signatureVersion: "v4"
          region: "eu-central-1"

        sinon.stub s3client.s3, 'getSignedUrl', (typeName, params, cb) ->
          cb(null, 'https://testBucket.s3.amazonaws.com/testKey.txt')

      after ->
        s3client.s3.getSignedUrl.restore()

      it 'should return json with signed and public urls', (done) ->
        uploadOptions =
          key: "testKey.txt"
          bucket: 'testBucket'
          extension: 'txt'
          acl: 'public-read'

        s3client.put uploadOptions, (err, urls) ->
          expect(urls).to.have.property 'signed_url'
          expect(urls).to.have.property 'public_url'
          done()

  runTests true
  runTests false



