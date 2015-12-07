var S3Client, _, crypto, mime, moment,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('lodash');

mime = require('mime');

moment = require('moment');

crypto = require('crypto');

S3Client = (function() {
  function S3Client(options, arrAllowedDataExtensions) {
    var aws;
    if (options == null) {
      options = {};
    }
    aws = require('aws-sdk');
    if (!(options instanceof aws.Config)) {
      this._checkOptions(options);
    }
    aws.config.update(options);
    this.s3 = new aws.S3();
    this.arrAllowedDataExtensions = null;
    if (arrAllowedDataExtensions && this._checkAllowedDataExtensions(arrAllowedDataExtensions)) {
      this.arrAllowedDataExtensions = arrAllowedDataExtensions;
    }
  }

  S3Client.prototype.uploadPostForm = function(options, cb) {
    var acl, algorithm, arrAlgorithm, bucket, conditionMatching, contentLength, contentType, dateKey, dateLongPolicy, dateRegionKey, dateRegionServiceKey, dateShortPolicy, expires, extension, hashalg, key, policy, policyDoc, ref, ref1, ref2, ref3, ref4, ref5, ref6, region, signature, signingKey, sigver, stream;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength, algorithm = options.algorithm, region = options.region, conditionMatching = options.conditionMatching;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : moment.utc().add(60, 'minutes').toDate();
    acl = (ref2 = options.acl) != null ? ref2 : 'public-read';
    contentLength = (ref3 = options.contentLength) != null ? ref3 : null;
    algorithm = (ref4 = options.algorithm) != null ? ref4 : 'AWS4-HMAC-SHA256';
    region = (ref5 = options.region) != null ? ref5 : this.region;
    conditionMatching = (ref6 = options.conditionMatching) != null ? ref6 : null;
    if (!(key && bucket)) {
      return cb(new Error('key and bucket are required'));
    }
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
    }
    if (algorithm.split('-').length === 3) {
      arrAlgorithm = algorithm.split('-');
      sigver = arrAlgorithm[0];
      hashalg = arrAlgorithm[2].toLowerCase();
    } else {
      sigver = "AWS4";
      hashalg = "sha256";
    }
    policyDoc = {};
    if (expires && _.isDate(expires)) {
      policyDoc["expiration"] = moment.utc(expires).format("YYYY-MM-DD[T]HH:MM:SS[Z]");
    }
    policyDoc["conditions"] = [];
    dateShortPolicy = moment.utc().format('YYYYMMDD');
    dateLongPolicy = moment.utc().format('YYYYMMDD[T]HHMMSS[Z]');
    policyDoc.conditions.push({
      'bucket': bucket
    });
    policyDoc.conditions.push(['starts-with', '$key', key]);
    policyDoc.conditions.push({
      'acl': acl
    });
    if (contentType) {
      policyDoc.conditions.push(['starts-with', '$Content-Type', contentType]);
    }
    if (contentLength) {
      policyDoc.conditions.push(['content-length-range', 0, contentLength]);
    }
    policyDoc.conditions.push({
      "x-amz-algorithm": algorithm
    });
    policyDoc.conditions.push({
      "x-amz-credential": this.accessKeyId + "/" + dateShortPolicy + "/" + region + "/s3/aws4_request"
    });
    policyDoc.conditions.push({
      "x-amz-date": dateLongPolicy
    });
    if (conditionMatching && _.isArray(conditionMatching)) {
      policyDoc.conditions = _.union(conditionMatching, policyDoc.conditions);
    }
    dateKey = crypto.createHmac(hashalg, "" + sigver + this.secretAccessKey).update(dateShortPolicy).digest();
    dateRegionKey = crypto.createHmac(hashalg, dateKey).update(region).digest();
    dateRegionServiceKey = crypto.createHmac(hashalg, dateRegionKey).update('s3').digest();
    signingKey = crypto.createHmac(hashalg, dateRegionServiceKey).update((sigver.toLowerCase()) + "_request").digest();
    policy = new Buffer(JSON.stringify(policyDoc)).toString('base64');
    signature = crypto.createHmac(hashalg, signingKey).update(policy).digest('hex');
    stream = {};
    stream['params'] = {
      "key": key,
      "acl": acl,
      "x-amz-algorithm": algorithm,
      "x-amz-credential": this.accessKeyId + "/" + dateShortPolicy + "/" + region + "/s3/" + (sigver.toLowerCase()) + "_request",
      "x-amz-date": dateLongPolicy,
      "policy": policy,
      "x-amz-signature": signature
    };
    if (contentType) {
      stream.params['content-type'] = contentType;
    }
    if (conditionMatching) {
      stream['conditions'] = conditionMatching;
    }
    stream['public_url'] = "https://" + bucket + ".s3.amazonaws.com/" + key;
    stream['form_url'] = "https://" + bucket + ".s3.amazonaws.com/";
    return cb(null, stream);
  };

  S3Client.prototype.upload = function(options, cb) {
    var acl, bucket, contentLength, contentType, data, expires, extension, key, params, ref, ref1, ref2, ref3;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    data = options.data, extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength;
    data = options.data;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : null;
    acl = (ref2 = options.acl) != null ? ref2 : null;
    contentLength = (ref3 = options.contentLength) != null ? ref3 : null;
    if (!(data && key && bucket)) {
      return cb(new Error('data, key and bucket are required'));
    }
    params = {
      Bucket: bucket,
      Key: key,
      Body: data
    };
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
      params["ContentType"] = contentType;
    }
    if (expires && _.isDate(expires)) {
      params["Expires"] = moment.utc(expires);
    }
    if (acl) {
      params["ACL"] = acl;
    }
    if (contentLength) {
      params["ContentLength"] = contentLength;
    }
    return this.s3.upload(params, function(err, data) {
      if (err) {
        return cb(err);
      }
      return cb(null, "https://" + bucket + ".s3.amazonaws.com/" + key);
    });
  };

  S3Client.prototype.put = function(options, cb) {
    var acl, bucket, contentLength, contentType, expires, extension, key, params, ref, ref1, ref2;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : null;
    acl = (ref2 = options.acl) != null ? ref2 : null;
    if (!(key && bucket)) {
      return cb(new Error('key and bucket are required'));
    }
    params = {
      Bucket: bucket,
      Key: key
    };
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
      params["ContentType"] = contentType;
    }
    if (expires && _.isDate(expires)) {
      params["Expires"] = moment.utc(expires);
    }
    if (acl) {
      params["ACL"] = acl;
    }
    return this.s3.getSignedUrl("putObject", params, function(err, data) {
      var put;
      if (err) {
        return cb(err);
      }
      put = {
        'signed_url': data,
        'public_url': "https://" + bucket + ".s3.amazonaws.com/" + key
      };
      return cb(null, put);
    });
  };

  S3Client.prototype._checkDataExtension = function(dataExtension) {
    if (!dataExtension || (this.arrAllowedDataExtensions && indexOf.call(this.arrAllowedDataExtensions, dataExtension) < 0)) {
      return false;
    }
    return mime.lookup(dataExtension);
  };

  S3Client.prototype._checkAllowedDataExtensions = function(arrAllowedDataExtensions) {
    var ext;
    if (!arrAllowedDataExtensions) {
      return false;
    }
    if (!_.isArray(arrAllowedDataExtensions)) {
      throw new Error("Allowed data extensions must be array of strings");
    }
    for (ext in arrAllowedDataExtensions) {
      if (!_.isString(ext)) {
        throw new Error("Extensions must be a strings");
      }
    }
    return true;
  };

  S3Client.prototype._checkOptions = function(options) {
    if (options == null) {
      options = {};
    }
    this.accessKeyId = options.accessKeyId, this.secretAccessKey = options.secretAccessKey, this.region = options.region, this.signatureVersion = options.signatureVersion, this.maxRetries = options.maxRetries, this.maxRedirects = options.maxRedirects, this.systemClockOffset = options.systemClockOffset, this.sslEnabled = options.sslEnabled, this.paramValidation = options.paramValidation, this.computeChecksums = options.computeChecksums, this.convertResponseTypes = options.convertResponseTypes, this.s3ForcePathStyle = options.s3ForcePathStyle, this.s3BucketEndpoint = options.s3BucketEndpoint, this.apiVersion = options.apiVersion, this.httpOptions = options.httpOptions, this.apiVersions = options.apiVersions, this.sessionToken = options.sessionToken, this.credentials = options.credentials, this.credentialProvider = options.credentialProvider, this.logger = options.logger;
    if (!this.accessKeyId) {
      throw new Error("accessKeyId is required");
    }
    if (!this.secretAccessKey) {
      throw new Error("secretAccessKey is required");
    }
    if (!this.region) {
      throw new Error("region is required");
    }
    if (!_.isString(this.accessKeyId)) {
      throw new Error("accessKeyId must be a string");
    }
    if (!_.isString(this.secretAccessKey)) {
      throw new Error("secretAccessKey must be a string");
    }
    if (!_.isString(this.region)) {
      throw new Error("region must be a string");
    }
    if (this.signatureVersion && !_.isString(this.signatureVersion)) {
      throw new Error("signatureVersion must be a string");
    }
    if (this.maxRetries && !_.isInteger(this.maxRetries)) {
      throw new Error('maxRetries must be a integer');
    }
    if (this.maxRedirects && !_.isInteger(this.maxRedirects)) {
      throw new Error('maxRedirects must be a integer');
    }
    if (this.systemClockOffset && !_.isNumber(this.systemClockOffset)) {
      throw new Error('systemClockOffset must be a number');
    }
    if (this.sslEnabled && !_.isBoolean(this.sslEnabled)) {
      throw new Error('sslEnabled must be a boolean');
    }
    if (this.paramValidation && !_.isBoolean(this.paramValidation)) {
      throw new Error('paramValidation must be a boolean');
    }
    if (this.computeChecksums && !_.isBoolean(this.computeChecksums)) {
      throw new Error('computeChecksums must be a boolean');
    }
    if (this.convertResponseTypes && !_.isBoolean(this.convertResponseTypes)) {
      throw new Error('convertResponseTypes must be a boolean');
    }
    if (this.s3ForcePathStyle && !_.isBoolean(this.s3ForcePathStyle)) {
      throw new Error('s3ForcePathStyle must be a boolean');
    }
    if (this.s3BucketEndpoint && !_.isBoolean(this.s3BucketEndpoint)) {
      throw new Error('s3BucketEndpoint must be a boolean');
    }
    if (this.httpOptions && !_.isPlainObject(this.httpOptions)) {
      throw new Error('httpOptions must be a dict with params: proxy, agent, timeout, xhrAsync, xhrWithCredentials');
    }
    if (this.apiVersions && !_.isPlainObject(this.apiVersions)) {
      throw new Error('apiVersions must be a dict with versions');
    }
    if (this.apiVersion && !(_.isString(this.apiVersion || _.isDate(this.apiVersion)))) {
      throw new Error('apiVersion must be a string or date');
    }
    if (this.sessionToken && !this.sessionToken instanceof aws.Credentials) {
      throw new Error('sessionToken must be a AWS.Credentials');
    }
    if (this.credentials && !this.credentials instanceof aws.Credentials) {
      throw new Error('credentials must be a AWS.Credentials');
    }
    if (this.credentialProvider && !this.credentialProvider instanceof aws.CredentialsProviderChain) {
      throw new Error('credentialProvider must be a AWS.CredentialsProviderChain');
    }
    if (this.logger && !(this.logger.write && this.logger.log)) {
      throw new Error('logger must have #write or #log methods');
    }
  };

  return S3Client;

})();

module.exports = S3Client;

//# sourceMappingURL=data:application/json;base64,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Iiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiIyBzMy1icm93c2VyLWRpcmVjdC11cGxvYWRcbl8gICAgICAgPSByZXF1aXJlKCdsb2Rhc2gnKVxubWltZSAgICA9IHJlcXVpcmUoJ21pbWUnKVxubW9tZW50ICA9IHJlcXVpcmUoJ21vbWVudCcpXG5jcnlwdG8gID0gcmVxdWlyZSgnY3J5cHRvJylcblxuXG5jbGFzcyBTM0NsaWVudFxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSwgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKSAtPlxuICAgIGF3cyA9IHJlcXVpcmUoJ2F3cy1zZGsnKVxuXG4gICAgQF9jaGVja09wdGlvbnMgb3B0aW9ucyB1bmxlc3Mgb3B0aW9ucyBpbnN0YW5jZW9mIGF3cy5Db25maWdcbiAgICBhd3MuY29uZmlnLnVwZGF0ZSBvcHRpb25zXG5cbiAgICBAczMgPSBuZXcgYXdzLlMzKClcblxuICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBudWxsXG4gICAgaWYgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBAX2NoZWNrQWxsb3dlZERhdGFFeHRlbnNpb25zIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG5cbiAgIyBCcm93c2VyIGZvcm0gcG9zdCBwYXJhbXMgZm9yIHVwbG9hZGluZ1xuICB1cGxvYWRQb3N0Rm9ybTogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGgsIGFsZ29yaXRobSwgcmVnaW9uLCBjb25kaXRpb25NYXRjaGluZyB9ID0gb3B0aW9uc1xuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbW9tZW50LnV0YygpLmFkZCg2MCwgJ21pbnV0ZXMnKS50b0RhdGUoKVxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gJ3B1YmxpYy1yZWFkJ1xuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgYWxnb3JpdGhtID0gb3B0aW9ucy5hbGdvcml0aG0gPyAnQVdTNC1ITUFDLVNIQTI1NidcbiAgICByZWdpb24gPSBvcHRpb25zLnJlZ2lvbiA/IEByZWdpb25cbiAgICBjb25kaXRpb25NYXRjaGluZyA9IG9wdGlvbnMuY29uZGl0aW9uTWF0Y2hpbmcgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuXG4gICAgaWYgYWxnb3JpdGhtLnNwbGl0KCctJykubGVuZ3RoID09IDNcbiAgICAgIGFyckFsZ29yaXRobSA9IGFsZ29yaXRobS5zcGxpdCgnLScpXG4gICAgICBzaWd2ZXIgPSBhcnJBbGdvcml0aG1bMF1cbiAgICAgIGhhc2hhbGcgPSBhcnJBbGdvcml0aG1bMl0udG9Mb3dlckNhc2UoKVxuICAgIGVsc2VcbiAgICAgIHNpZ3ZlciA9IFwiQVdTNFwiXG4gICAgICBoYXNoYWxnID0gXCJzaGEyNTZcIlxuXG4gICAgcG9saWN5RG9jID0ge31cblxuICAgIHBvbGljeURvY1tcImV4cGlyYXRpb25cIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpLmZvcm1hdChcIllZWVktTU0tRERbVF1ISDpNTTpTU1taXVwiKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcG9saWN5RG9jW1wiY29uZGl0aW9uc1wiXSA9IFtdXG5cbiAgICBkYXRlU2hvcnRQb2xpY3kgPSBtb21lbnQudXRjKCkuZm9ybWF0KCdZWVlZTU1ERCcpXG4gICAgZGF0ZUxvbmdQb2xpY3kgPSBtb21lbnQudXRjKCkuZm9ybWF0KCdZWVlZTU1ERFtUXUhITU1TU1taXScpXG5cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2J1Y2tldCc6IGJ1Y2tldCB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICcka2V5Jywga2V5IF1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2FjbCc6IGFjbCB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICckQ29udGVudC1UeXBlJywgY29udGVudFR5cGUgXSBpZiBjb250ZW50VHlwZVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnY29udGVudC1sZW5ndGgtcmFuZ2UnLCAwLCBjb250ZW50TGVuZ3RoIF0gaWYgY29udGVudExlbmd0aFxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG0gfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWNyZWRlbnRpYWxcIjogXCIje0BhY2Nlc3NLZXlJZH0vI3tkYXRlU2hvcnRQb2xpY3l9LyN7cmVnaW9ufS9zMy9hd3M0X3JlcXVlc3RcIiB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotZGF0ZVwiOiBkYXRlTG9uZ1BvbGljeX1cblxuICAgIGlmIGNvbmRpdGlvbk1hdGNoaW5nIGFuZCBfLmlzQXJyYXkgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICAgIHBvbGljeURvYy5jb25kaXRpb25zID0gXy51bmlvbiBjb25kaXRpb25NYXRjaGluZywgcG9saWN5RG9jLmNvbmRpdGlvbnNcblxuICAgIGRhdGVLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBcIiN7c2lndmVyfSN7QHNlY3JldEFjY2Vzc0tleX1cIikudXBkYXRlKGRhdGVTaG9ydFBvbGljeSkuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZUtleSkudXBkYXRlKHJlZ2lvbikuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uU2VydmljZUtleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVSZWdpb25LZXkpLnVwZGF0ZSgnczMnKS5kaWdlc3QoKVxuICAgIHNpZ25pbmdLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uU2VydmljZUtleSkudXBkYXRlKFwiI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiKS5kaWdlc3QoKVxuICAgIHBvbGljeSA9IG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkocG9saWN5RG9jKSkudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgc2lnbmF0dXJlID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZyxzaWduaW5nS2V5KS51cGRhdGUocG9saWN5KS5kaWdlc3QoJ2hleCcpXG5cbiAgICBzdHJlYW0gPSB7fVxuICAgIHN0cmVhbVsncGFyYW1zJ10gPVxuICAgICAgXCJrZXlcIjoga2V5XG4gICAgICBcImFjbFwiOiBhY2xcbiAgICAgIFwieC1hbXotYWxnb3JpdGhtXCI6IGFsZ29yaXRobVxuICAgICAgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiXG4gICAgICBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3lcbiAgICAgIFwicG9saWN5XCI6IHBvbGljeVxuICAgICAgXCJ4LWFtei1zaWduYXR1cmVcIjogc2lnbmF0dXJlXG4gICAgc3RyZWFtLnBhcmFtc1snY29udGVudC10eXBlJ10gPSBjb250ZW50VHlwZSBpZiBjb250ZW50VHlwZVxuICAgIHN0cmVhbVsnY29uZGl0aW9ucyddICA9IGNvbmRpdGlvbk1hdGNoaW5nIGlmIGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgc3RyZWFtWydwdWJsaWNfdXJsJ10gID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG4gICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tL1wiXG5cbiAgICBjYiBudWxsLCBzdHJlYW1cblxuXG4gICMgUzMudXBsb2FkXG4gIHVwbG9hZDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBkYXRhLCBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBkYXRhID0gb3B0aW9ucy5kYXRhXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG4gICAgY29udGVudExlbmd0aCA9IG9wdGlvbnMuY29udGVudExlbmd0aCA/IG51bGxcbiAgICBcbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBkYXRhIGFuZCBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnZGF0YSwga2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuICAgICAgQm9keTogZGF0YVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcbiAgICBwYXJhbXNbXCJDb250ZW50TGVuZ3RoXCJdID0gY29udGVudExlbmd0aCBpZiBjb250ZW50TGVuZ3RoXG5cbiAgICBAczMudXBsb2FkIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG4gICAgICBjYiBudWxsLCBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuXG4gICMgUzMucHV0T2JqZWN0XG4gIHB1dDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcblxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuXG4gICAgQHMzLmdldFNpZ25lZFVybCBcInB1dE9iamVjdFwiLCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuXG4gICAgICBwdXQgPVxuICAgICAgICAnc2lnbmVkX3VybCc6IGRhdGFcbiAgICAgICAgJ3B1YmxpY191cmwnOiBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuICAgICAgY2IgbnVsbCwgcHV0XG5cblxuICAjIENoZWNrIGRhdGEgdHlwZSBmcm9tIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICBfY2hlY2tEYXRhRXh0ZW5zaW9uOiAoZGF0YUV4dGVuc2lvbikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgbm90IGRhdGFFeHRlbnNpb24gb3IgKEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIGRhdGFFeHRlbnNpb24gbm90IGluIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpXG4gICAgcmV0dXJuIG1pbWUubG9va3VwIGRhdGFFeHRlbnNpb25cblxuXG4gICMgQ2hlY2sgYWxsb3dlZCBkYXRhIHR5cGVzXG4gIF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9uczogKGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG4gICAgdW5sZXNzIF8uaXNBcnJheSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkFsbG93ZWQgZGF0YSBleHRlbnNpb25zIG11c3QgYmUgYXJyYXkgb2Ygc3RyaW5nc1wiXG5cbiAgICBmb3IgZXh0IG9mIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdW5sZXNzIF8uaXNTdHJpbmcgZXh0XG4gICAgICAgIHRocm93IG5ldyBFcnJvciBcIkV4dGVuc2lvbnMgbXVzdCBiZSBhIHN0cmluZ3NcIlxuXG4gICAgcmV0dXJuIHRydWVcblxuXG4gICMgQ2hlY2sgb3B0aW9ucyBwYXJhbXNcbiAgX2NoZWNrT3B0aW9uczogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICB7XG4gICAgICBAYWNjZXNzS2V5SWQsIEBzZWNyZXRBY2Nlc3NLZXksIEByZWdpb24sIEBzaWduYXR1cmVWZXJzaW9uLCBAbWF4UmV0cmllcywgQG1heFJlZGlyZWN0cywgQHN5c3RlbUNsb2NrT2Zmc2V0LFxuICAgICAgQHNzbEVuYWJsZWQsIEBwYXJhbVZhbGlkYXRpb24sIEBjb21wdXRlQ2hlY2tzdW1zLCBAY29udmVydFJlc3BvbnNlVHlwZXMsIEBzM0ZvcmNlUGF0aFN0eWxlLCBAczNCdWNrZXRFbmRwb2ludCxcbiAgICAgIEBhcGlWZXJzaW9uLCBAaHR0cE9wdGlvbnMsIEBhcGlWZXJzaW9ucywgQHNlc3Npb25Ub2tlbiwgQGNyZWRlbnRpYWxzLCBAY3JlZGVudGlhbFByb3ZpZGVyLCBAbG9nZ2VyXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIHVubGVzcyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNpZ25hdHVyZVZlcnNpb24gYW5kIG5vdCBfLmlzU3RyaW5nIEBzaWduYXR1cmVWZXJzaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzaWduYXR1cmVWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQG1heFJldHJpZXMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmV0cmllc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZXRyaWVzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQG1heFJlZGlyZWN0cyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZWRpcmVjdHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmVkaXJlY3RzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQHN5c3RlbUNsb2NrT2Zmc2V0IGFuZCBub3QgXy5pc051bWJlciBAc3lzdGVtQ2xvY2tPZmZzZXRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3lzdGVtQ2xvY2tPZmZzZXQgbXVzdCBiZSBhIG51bWJlcidcblxuICAgIGlmIEBzc2xFbmFibGVkIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHNzbEVuYWJsZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3NsRW5hYmxlZCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBwYXJhbVZhbGlkYXRpb24gYW5kIG5vdCBfLmlzQm9vbGVhbiBAcGFyYW1WYWxpZGF0aW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3BhcmFtVmFsaWRhdGlvbiBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb21wdXRlQ2hlY2tzdW1zIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbXB1dGVDaGVja3N1bXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29tcHV0ZUNoZWNrc3VtcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb252ZXJ0UmVzcG9uc2VUeXBlcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb252ZXJ0UmVzcG9uc2VUeXBlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb252ZXJ0UmVzcG9uc2VUeXBlcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0ZvcmNlUGF0aFN0eWxlIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNGb3JjZVBhdGhTdHlsZSBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0J1Y2tldEVuZHBvaW50IGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzQnVja2V0RW5kcG9pbnRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNCdWNrZXRFbmRwb2ludCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBodHRwT3B0aW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAaHR0cE9wdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnaHR0cE9wdGlvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCBwYXJhbXM6IHByb3h5LCBhZ2VudCwgdGltZW91dCwgeGhyQXN5bmMsIHhocldpdGhDcmVkZW50aWFscydcblxuICAgIGlmIEBhcGlWZXJzaW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAYXBpVmVyc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCB2ZXJzaW9ucydcblxuICAgIGlmIEBhcGlWZXJzaW9uIGFuZCBub3QgKF8uaXNTdHJpbmcgQGFwaVZlcnNpb24gb3IgXy5pc0RhdGUgQGFwaVZlcnNpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZyBvciBkYXRlJ1xuXG4gICAgaWYgQHNlc3Npb25Ub2tlbiBhbmQgbm90IEBzZXNzaW9uVG9rZW4gaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc2Vzc2lvblRva2VuIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbHMgYW5kIG5vdCBAY3JlZGVudGlhbHMgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbHMgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFsUHJvdmlkZXIgYW5kIG5vdCBAY3JlZGVudGlhbFByb3ZpZGVyIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFsUHJvdmlkZXIgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW4nXG5cbiAgICBpZiBAbG9nZ2VyIGFuZCBub3QgKEBsb2dnZXIud3JpdGUgYW5kIEBsb2dnZXIubG9nKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdsb2dnZXIgbXVzdCBoYXZlICN3cml0ZSBvciAjbG9nIG1ldGhvZHMnXG5cblxuIyBFeHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IFMzQ2xpZW50XG5cbiJdfQ==