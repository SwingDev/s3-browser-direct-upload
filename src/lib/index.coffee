# s3-browser-direct-upload
_       = require('lodash')
mime    = require('mime')
moment  = require('moment')
crypto  = require('crypto')


class S3Client
  constructor: (options = {}, arrAllowedDataExtensions) ->
    aws = require('aws-sdk')

    @_checkOptions options unless options instanceof aws.Config
    aws.config.update options

    @s3 = new aws.S3()

    @arrAllowedDataExtensions = null
    if arrAllowedDataExtensions and @_checkAllowedDataExtensions arrAllowedDataExtensions
      @arrAllowedDataExtensions = arrAllowedDataExtensions


  # Browser form post params for uploading
  uploadPostForm: (options = {}, cb) ->
    throw new Error 'Callback is required' unless cb
    { extension, key, bucket, expires, acl, contentLength, algorithm, region, conditionMatching } = options
    key = options.key
    bucket = options.bucket
    extension = options.extension ? null
    expires = options.expires ? moment.utc().add(60, 'minutes').toDate()
    acl = options.acl ? 'public-read'
    contentLength = options.contentLength ? null
    algorithm = options.algorithm ? 'AWS4-HMAC-SHA256'
    region = options.region ? @region
    conditionMatching = options.conditionMatching ? null

    # @TODO options type check
    unless key and bucket
      return cb new Error 'key and bucket are required'

    if extension
      contentType = @_checkDataExtension extension
      return cb new Error 'Data extension not allowed' unless contentType

    if algorithm.split('-').length == 3
      arrAlgorithm = algorithm.split('-')
      sigver = arrAlgorithm[0]
      hashalg = arrAlgorithm[2].toLowerCase()
    else
      sigver = "AWS4"
      hashalg = "sha256"

    policyDoc = {}

    policyDoc["expiration"] = moment.utc(expires).format("YYYY-MM-DD[T]HH:MM:SS[Z]") if expires and _.isDate expires
    policyDoc["conditions"] = []

    dateShortPolicy = moment.utc().format('YYYYMMDD')
    dateLongPolicy = moment.utc().format('YYYYMMDD[T]HHMMSS[Z]')

    policyDoc.conditions.push { 'bucket': bucket }
    policyDoc.conditions.push [ 'starts-with', '$key', key ]
    policyDoc.conditions.push { 'acl': acl }
    policyDoc.conditions.push [ 'starts-with', '$Content-Type', contentType ] if contentType
    policyDoc.conditions.push [ 'content-length-range', 0, contentLength ] if contentLength
    policyDoc.conditions.push { "x-amz-algorithm": algorithm }
    policyDoc.conditions.push { "x-amz-credential": "#{@accessKeyId}/#{dateShortPolicy}/#{region}/s3/aws4_request" }
    policyDoc.conditions.push { "x-amz-date": dateLongPolicy}

    if conditionMatching and _.isArray conditionMatching
      policyDoc.conditions = _.union conditionMatching, policyDoc.conditions

    dateKey = crypto.createHmac(hashalg, "#{sigver}#{@secretAccessKey}").update(dateShortPolicy).digest()
    dateRegionKey = crypto.createHmac(hashalg, dateKey).update(region).digest()
    dateRegionServiceKey = crypto.createHmac(hashalg, dateRegionKey).update('s3').digest()
    signingKey = crypto.createHmac(hashalg, dateRegionServiceKey).update("#{sigver.toLowerCase()}_request").digest()
    policy = new Buffer(JSON.stringify(policyDoc)).toString('base64')
    signature = crypto.createHmac(hashalg,signingKey).update(policy).digest('hex')

    stream = {}
    stream['params'] =
      "key": key
      "acl": acl
      "x-amz-algorithm": algorithm
      "x-amz-credential": "#{@accessKeyId}/#{dateShortPolicy}/#{region}/s3/#{sigver.toLowerCase()}_request"
      "x-amz-date": dateLongPolicy
      "policy": policy
      "x-amz-signature": signature
    stream.params['content-type'] = contentType if contentType
    stream['conditions']  = conditionMatching if conditionMatching
    stream['public_url']  = "https://#{bucket}.s3.amazonaws.com/#{key}"
    stream['form_url']    = "https://#{bucket}.s3.amazonaws.com/"

    cb null, stream


  # S3.upload
  upload: (options = {}, cb) ->
    throw new Error 'Callback is required' unless cb
    { data, extension, key, bucket, expires, acl, contentLength } = options
    data = options.data
    key = options.key
    bucket = options.bucket
    extension = options.extension ? null
    expires = options.expires ? null
    acl = options.acl ? null
    contentLength = options.contentLength ? null
    
    # @TODO options type check
    unless data and key and bucket
      return cb new Error 'data, key and bucket are required'

    params =
      Bucket: bucket
      Key: key
      Body: data

    if extension
      contentType = @_checkDataExtension extension
      return cb new Error 'Data extension not allowed' unless contentType
      params["ContentType"] = contentType

    params["Expires"] = moment.utc(expires) if expires and _.isDate expires
    params["ACL"] = acl if acl
    params["ContentLength"] = contentLength if contentLength

    @s3.upload params, (err, data) ->
      return cb err if err
      cb null, "https://#{bucket}.s3.amazonaws.com/#{key}"


  # S3.putObject
  put: (options = {}, cb) ->
    throw new Error 'Callback is required' unless cb
    { extension, key, bucket, expires, acl, contentLength } = options
    key = options.key
    bucket = options.bucket
    extension = options.extension ? null
    expires = options.expires ? null
    acl = options.acl ? null

    # @TODO options type check
    unless key and bucket
      return cb new Error 'key and bucket are required'

    params =
      Bucket: bucket
      Key: key

    if extension
      contentType = @_checkDataExtension extension
      return cb new Error 'Data extension not allowed' unless contentType
      params["ContentType"] = contentType

    params["Expires"] = moment.utc(expires) if expires and _.isDate expires
    params["ACL"] = acl if acl

    @s3.getSignedUrl "putObject", params, (err, data) ->
      return cb err if err

      put =
        'signed_url': data
        'public_url': "https://#{bucket}.s3.amazonaws.com/#{key}"

      cb null, put


  # Check data type from arrAllowedDataExtensions
  _checkDataExtension: (dataExtension) ->
    return false if not dataExtension or (@arrAllowedDataExtensions and dataExtension not in @arrAllowedDataExtensions)
    return mime.lookup dataExtension


  # Check allowed data types
  _checkAllowedDataExtensions: (arrAllowedDataExtensions) ->
    return false unless arrAllowedDataExtensions

    unless _.isArray arrAllowedDataExtensions
      throw new Error "Allowed data extensions must be array of strings"

    for ext of arrAllowedDataExtensions
      unless _.isString ext
        throw new Error "Extensions must be a strings"

    return true


  # Check options params
  _checkOptions: (options = {}) ->
    {
      @accessKeyId, @secretAccessKey, @region, @signatureVersion, @maxRetries, @maxRedirects, @systemClockOffset,
      @sslEnabled, @paramValidation, @computeChecksums, @convertResponseTypes, @s3ForcePathStyle, @s3BucketEndpoint,
      @apiVersion, @httpOptions, @apiVersions, @sessionToken, @credentials, @credentialProvider, @logger
    } = options

    unless @accessKeyId
      throw new Error "accessKeyId is required"

    unless @secretAccessKey
      throw new Error "secretAccessKey is required"

    unless @region
      throw new Error "region is required"

    unless _.isString @accessKeyId
      throw new Error "accessKeyId must be a string"

    unless _.isString @secretAccessKey
      throw new Error "secretAccessKey must be a string"

    unless _.isString @region
      throw new Error "region must be a string"

    if @signatureVersion and not _.isString @signatureVersion
      throw new Error "signatureVersion must be a string"

    if @maxRetries and not _.isInteger @maxRetries
      throw new Error 'maxRetries must be a integer'

    if @maxRedirects and not _.isInteger @maxRedirects
      throw new Error 'maxRedirects must be a integer'

    if @systemClockOffset and not _.isNumber @systemClockOffset
      throw new Error 'systemClockOffset must be a number'

    if @sslEnabled and not _.isBoolean @sslEnabled
      throw new Error 'sslEnabled must be a boolean'

    if @paramValidation and not _.isBoolean @paramValidation
      throw new Error 'paramValidation must be a boolean'

    if @computeChecksums and not _.isBoolean @computeChecksums
      throw new Error 'computeChecksums must be a boolean'

    if @convertResponseTypes and not _.isBoolean @convertResponseTypes
      throw new Error 'convertResponseTypes must be a boolean'

    if @s3ForcePathStyle and not _.isBoolean @s3ForcePathStyle
      throw new Error 's3ForcePathStyle must be a boolean'

    if @s3BucketEndpoint and not _.isBoolean @s3BucketEndpoint
      throw new Error 's3BucketEndpoint must be a boolean'

    if @httpOptions and not _.isPlainObject @httpOptions
      throw new Error 'httpOptions must be a dict with params: proxy, agent, timeout, xhrAsync, xhrWithCredentials'

    if @apiVersions and not _.isPlainObject @apiVersions
      throw new Error 'apiVersions must be a dict with versions'

    if @apiVersion and not (_.isString @apiVersion or _.isDate @apiVersion)
      throw new Error 'apiVersion must be a string or date'

    if @sessionToken and not @sessionToken instanceof aws.Credentials
      throw new Error 'sessionToken must be a AWS.Credentials'

    if @credentials and not @credentials instanceof aws.Credentials
      throw new Error 'credentials must be a AWS.Credentials'

    if @credentialProvider and not @credentialProvider instanceof aws.CredentialsProviderChain
      throw new Error 'credentialProvider must be a AWS.CredentialsProviderChain'

    if @logger and not (@logger.write and @logger.log)
      throw new Error 'logger must have #write or #log methods'


# Exports
module.exports = S3Client

