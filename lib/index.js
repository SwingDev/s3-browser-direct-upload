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
    this.s3 = new aws.S3(options);
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
      policyDoc["expiration"] = moment.utc(expires).format("YYYY-MM-DD[T]HH:mm:ss[Z]");
    }
    policyDoc["conditions"] = [];
    dateShortPolicy = moment.utc().format('YYYYMMDD');
    dateLongPolicy = moment.utc().format('YYYYMMDD[T]HHmmss[Z]');
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
    if (!this.region) {
      throw new Error("region is required");
    }
    if (this.accessKeyId && !_.isString(this.accessKeyId)) {
      throw new Error("accessKeyId must be a string");
    }
    if (this.secretAccessKey && !_.isString(this.secretAccessKey)) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBTSxJQUFJLEdBQUcsQ0FBQyxFQUFSLENBQVcsT0FBWDtJQUVOLElBQUMsQ0FBQSx3QkFBRCxHQUE0QjtJQUM1QixJQUFHLHdCQUFBLElBQTZCLElBQUMsQ0FBQSwyQkFBRCxDQUE2Qix3QkFBN0IsQ0FBaEM7TUFDRSxJQUFDLENBQUEsd0JBQUQsR0FBNEIseUJBRDlCOztFQVJXOztxQkFhYixjQUFBLEdBQWdCLFNBQUMsT0FBRCxFQUFlLEVBQWY7QUFDZCxRQUFBOztNQURlLFVBQVU7O0lBQ3pCLElBQUEsQ0FBOEMsRUFBOUM7QUFBQSxZQUFNLElBQUksS0FBSixDQUFVLHNCQUFWLEVBQU47O0lBQ0UsNkJBQUYsRUFBYSxpQkFBYixFQUFrQix1QkFBbEIsRUFBMEIseUJBQTFCLEVBQW1DLGlCQUFuQyxFQUF3QyxxQ0FBeEMsRUFBdUQsNkJBQXZELEVBQWtFLHVCQUFsRSxFQUEwRTtJQUMxRSxHQUFBLEdBQU0sT0FBTyxDQUFDO0lBQ2QsTUFBQSxHQUFTLE9BQU8sQ0FBQztJQUNqQixTQUFBLDZDQUFnQztJQUNoQyxPQUFBLDZDQUE0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LENBQUEsVUFBRCxJQUFnQixDQUFJLENBQUMsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxJQUFDLENBQUEsVUFBRCxJQUFlLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLFVBQVYsQ0FBMUIsQ0FBRCxDQUF2QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUscUNBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxZQUFELElBQWtCLENBQUksSUFBQyxDQUFBLFlBQUwsWUFBNkIsR0FBRyxDQUFDLFdBQXREO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx3Q0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLFdBQUQsSUFBaUIsQ0FBSSxJQUFDLENBQUEsV0FBTCxZQUE0QixHQUFHLENBQUMsV0FBcEQ7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLHVDQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsa0JBQUQsSUFBd0IsQ0FBSSxJQUFDLENBQUEsa0JBQUwsWUFBbUMsR0FBRyxDQUFDLHdCQUFsRTtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsMkRBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxDQUFDLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixJQUFrQixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQTNCLENBQW5CO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx5Q0FBVixFQURSOztFQW5FYTs7Ozs7O0FBd0VqQixNQUFNLENBQUMsT0FBUCxHQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIiMgczMtYnJvd3Nlci1kaXJlY3QtdXBsb2FkXG5fICAgICAgID0gcmVxdWlyZSgnbG9kYXNoJylcbm1pbWUgICAgPSByZXF1aXJlKCdtaW1lJylcbm1vbWVudCAgPSByZXF1aXJlKCdtb21lbnQnKVxuY3J5cHRvICA9IHJlcXVpcmUoJ2NyeXB0bycpXG5cblxuY2xhc3MgUzNDbGllbnRcbiAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30sIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICBhd3MgPSByZXF1aXJlKCdhd3Mtc2RrJylcblxuICAgIEBfY2hlY2tPcHRpb25zIG9wdGlvbnMgdW5sZXNzIG9wdGlvbnMgaW5zdGFuY2VvZiBhd3MuQ29uZmlnXG5cbiAgICBAczMgPSBuZXcgYXdzLlMzKG9wdGlvbnMpXG5cbiAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gbnVsbFxuICAgIGlmIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyBhbmQgQF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9ucyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuXG4gICMgQnJvd3NlciBmb3JtIHBvc3QgcGFyYW1zIGZvciB1cGxvYWRpbmdcbiAgdXBsb2FkUG9zdEZvcm06IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoLCBhbGdvcml0aG0sIHJlZ2lvbiwgY29uZGl0aW9uTWF0Y2hpbmcgfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG1vbWVudC51dGMoKS5hZGQoNjAsICdtaW51dGVzJykudG9EYXRlKClcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/ICdwdWJsaWMtcmVhZCdcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGFsZ29yaXRobSA9IG9wdGlvbnMuYWxnb3JpdGhtID8gJ0FXUzQtSE1BQy1TSEEyNTYnXG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb24gPyBAcmVnaW9uXG4gICAgY29uZGl0aW9uTWF0Y2hpbmcgPSBvcHRpb25zLmNvbmRpdGlvbk1hdGNoaW5nID8gbnVsbFxuXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcblxuICAgIGlmIGFsZ29yaXRobS5zcGxpdCgnLScpLmxlbmd0aCA9PSAzXG4gICAgICBhcnJBbGdvcml0aG0gPSBhbGdvcml0aG0uc3BsaXQoJy0nKVxuICAgICAgc2lndmVyID0gYXJyQWxnb3JpdGhtWzBdXG4gICAgICBoYXNoYWxnID0gYXJyQWxnb3JpdGhtWzJdLnRvTG93ZXJDYXNlKClcbiAgICBlbHNlXG4gICAgICBzaWd2ZXIgPSBcIkFXUzRcIlxuICAgICAgaGFzaGFsZyA9IFwic2hhMjU2XCJcblxuICAgIHBvbGljeURvYyA9IHt9XG5cbiAgICBwb2xpY3lEb2NbXCJleHBpcmF0aW9uXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKS5mb3JtYXQoXCJZWVlZLU1NLUREW1RdSEg6bW06c3NbWl1cIikgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBvbGljeURvY1tcImNvbmRpdGlvbnNcIl0gPSBbXVxuXG4gICAgZGF0ZVNob3J0UG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NREQnKVxuICAgIGRhdGVMb25nUG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NRERbVF1ISG1tc3NbWl0nKVxuXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdidWNrZXQnOiBidWNrZXQgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJGtleScsIGtleSBdXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdhY2wnOiBhY2wgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlIF0gaWYgY29udGVudFR5cGVcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ2NvbnRlbnQtbGVuZ3RoLXJhbmdlJywgMCwgY29udGVudExlbmd0aCBdIGlmIGNvbnRlbnRMZW5ndGhcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvYXdzNF9yZXF1ZXN0XCIgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3l9XG5cbiAgICBpZiBjb25kaXRpb25NYXRjaGluZyBhbmQgXy5pc0FycmF5IGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgICBwb2xpY3lEb2MuY29uZGl0aW9ucyA9IF8udW5pb24gY29uZGl0aW9uTWF0Y2hpbmcsIHBvbGljeURvYy5jb25kaXRpb25zXG5cbiAgICBkYXRlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgXCIje3NpZ3Zlcn0je0BzZWNyZXRBY2Nlc3NLZXl9XCIpLnVwZGF0ZShkYXRlU2hvcnRQb2xpY3kpLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvbktleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVLZXkpLnVwZGF0ZShyZWdpb24pLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvblNlcnZpY2VLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uS2V5KS51cGRhdGUoJ3MzJykuZGlnZXN0KClcbiAgICBzaWduaW5nS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvblNlcnZpY2VLZXkpLnVwZGF0ZShcIiN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIikuZGlnZXN0KClcbiAgICBwb2xpY3kgPSBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHBvbGljeURvYykpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsc2lnbmluZ0tleSkudXBkYXRlKHBvbGljeSkuZGlnZXN0KCdoZXgnKVxuXG4gICAgc3RyZWFtID0ge31cbiAgICBzdHJlYW1bJ3BhcmFtcyddID1cbiAgICAgIFwia2V5XCI6IGtleVxuICAgICAgXCJhY2xcIjogYWNsXG4gICAgICBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG1cbiAgICAgIFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzLyN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIlxuICAgICAgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5XG4gICAgICBcInBvbGljeVwiOiBwb2xpY3lcbiAgICAgIFwieC1hbXotc2lnbmF0dXJlXCI6IHNpZ25hdHVyZVxuICAgIHN0cmVhbS5wYXJhbXNbJ2NvbnRlbnQtdHlwZSddID0gY29udGVudFR5cGUgaWYgY29udGVudFR5cGVcbiAgICBzdHJlYW1bJ2NvbmRpdGlvbnMnXSAgPSBjb25kaXRpb25NYXRjaGluZyBpZiBjb25kaXRpb25NYXRjaGluZ1xuICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS9cIlxuXG4gICAgY2IgbnVsbCwgc3RyZWFtXG5cblxuICAjIFMzLnVwbG9hZFxuICB1cGxvYWQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZGF0YSwgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAgZGF0YSA9IG9wdGlvbnMuZGF0YVxuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbnVsbFxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gbnVsbFxuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBkYXRhIGFuZCBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnZGF0YSwga2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuICAgICAgQm9keTogZGF0YVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcbiAgICBwYXJhbXNbXCJDb250ZW50TGVuZ3RoXCJdID0gY29udGVudExlbmd0aCBpZiBjb250ZW50TGVuZ3RoXG5cbiAgICBAczMudXBsb2FkIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG4gICAgICBjYiBudWxsLCBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuXG4gICMgUzMucHV0T2JqZWN0XG4gIHB1dDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcblxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuXG4gICAgQHMzLmdldFNpZ25lZFVybCBcInB1dE9iamVjdFwiLCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuXG4gICAgICBwdXQgPVxuICAgICAgICAnc2lnbmVkX3VybCc6IGRhdGFcbiAgICAgICAgJ3B1YmxpY191cmwnOiBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuICAgICAgY2IgbnVsbCwgcHV0XG5cblxuICAjIENoZWNrIGRhdGEgdHlwZSBmcm9tIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICBfY2hlY2tEYXRhRXh0ZW5zaW9uOiAoZGF0YUV4dGVuc2lvbikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgbm90IGRhdGFFeHRlbnNpb24gb3IgKEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIGRhdGFFeHRlbnNpb24gbm90IGluIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpXG4gICAgcmV0dXJuIG1pbWUubG9va3VwIGRhdGFFeHRlbnNpb25cblxuXG4gICMgQ2hlY2sgYWxsb3dlZCBkYXRhIHR5cGVzXG4gIF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9uczogKGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG4gICAgdW5sZXNzIF8uaXNBcnJheSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkFsbG93ZWQgZGF0YSBleHRlbnNpb25zIG11c3QgYmUgYXJyYXkgb2Ygc3RyaW5nc1wiXG5cbiAgICBmb3IgZXh0IG9mIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdW5sZXNzIF8uaXNTdHJpbmcgZXh0XG4gICAgICAgIHRocm93IG5ldyBFcnJvciBcIkV4dGVuc2lvbnMgbXVzdCBiZSBhIHN0cmluZ3NcIlxuXG4gICAgcmV0dXJuIHRydWVcblxuXG4gICMgQ2hlY2sgb3B0aW9ucyBwYXJhbXNcbiAgX2NoZWNrT3B0aW9uczogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICB7XG4gICAgICBAYWNjZXNzS2V5SWQsIEBzZWNyZXRBY2Nlc3NLZXksIEByZWdpb24sIEBzaWduYXR1cmVWZXJzaW9uLCBAbWF4UmV0cmllcywgQG1heFJlZGlyZWN0cywgQHN5c3RlbUNsb2NrT2Zmc2V0LFxuICAgICAgQHNzbEVuYWJsZWQsIEBwYXJhbVZhbGlkYXRpb24sIEBjb21wdXRlQ2hlY2tzdW1zLCBAY29udmVydFJlc3BvbnNlVHlwZXMsIEBzM0ZvcmNlUGF0aFN0eWxlLCBAczNCdWNrZXRFbmRwb2ludCxcbiAgICAgIEBhcGlWZXJzaW9uLCBAaHR0cE9wdGlvbnMsIEBhcGlWZXJzaW9ucywgQHNlc3Npb25Ub2tlbiwgQGNyZWRlbnRpYWxzLCBAY3JlZGVudGlhbFByb3ZpZGVyLCBAbG9nZ2VyXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIHVubGVzcyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gaXMgcmVxdWlyZWRcIlxuXG4gICAgaWYgQGFjY2Vzc0tleUlkIGFuZCBub3QgXy5pc1N0cmluZyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNlY3JldEFjY2Vzc0tleSBhbmQgbm90IF8uaXNTdHJpbmcgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNpZ25hdHVyZVZlcnNpb24gYW5kIG5vdCBfLmlzU3RyaW5nIEBzaWduYXR1cmVWZXJzaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzaWduYXR1cmVWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQG1heFJldHJpZXMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmV0cmllc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZXRyaWVzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQG1heFJlZGlyZWN0cyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZWRpcmVjdHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmVkaXJlY3RzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQHN5c3RlbUNsb2NrT2Zmc2V0IGFuZCBub3QgXy5pc051bWJlciBAc3lzdGVtQ2xvY2tPZmZzZXRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3lzdGVtQ2xvY2tPZmZzZXQgbXVzdCBiZSBhIG51bWJlcidcblxuICAgIGlmIEBzc2xFbmFibGVkIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHNzbEVuYWJsZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3NsRW5hYmxlZCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBwYXJhbVZhbGlkYXRpb24gYW5kIG5vdCBfLmlzQm9vbGVhbiBAcGFyYW1WYWxpZGF0aW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3BhcmFtVmFsaWRhdGlvbiBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb21wdXRlQ2hlY2tzdW1zIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbXB1dGVDaGVja3N1bXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29tcHV0ZUNoZWNrc3VtcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb252ZXJ0UmVzcG9uc2VUeXBlcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb252ZXJ0UmVzcG9uc2VUeXBlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb252ZXJ0UmVzcG9uc2VUeXBlcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0ZvcmNlUGF0aFN0eWxlIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNGb3JjZVBhdGhTdHlsZSBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0J1Y2tldEVuZHBvaW50IGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzQnVja2V0RW5kcG9pbnRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNCdWNrZXRFbmRwb2ludCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBodHRwT3B0aW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAaHR0cE9wdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnaHR0cE9wdGlvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCBwYXJhbXM6IHByb3h5LCBhZ2VudCwgdGltZW91dCwgeGhyQXN5bmMsIHhocldpdGhDcmVkZW50aWFscydcblxuICAgIGlmIEBhcGlWZXJzaW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAYXBpVmVyc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCB2ZXJzaW9ucydcblxuICAgIGlmIEBhcGlWZXJzaW9uIGFuZCBub3QgKF8uaXNTdHJpbmcgQGFwaVZlcnNpb24gb3IgXy5pc0RhdGUgQGFwaVZlcnNpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZyBvciBkYXRlJ1xuXG4gICAgaWYgQHNlc3Npb25Ub2tlbiBhbmQgbm90IEBzZXNzaW9uVG9rZW4gaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc2Vzc2lvblRva2VuIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbHMgYW5kIG5vdCBAY3JlZGVudGlhbHMgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbHMgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFsUHJvdmlkZXIgYW5kIG5vdCBAY3JlZGVudGlhbFByb3ZpZGVyIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFsUHJvdmlkZXIgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW4nXG5cbiAgICBpZiBAbG9nZ2VyIGFuZCBub3QgKEBsb2dnZXIud3JpdGUgYW5kIEBsb2dnZXIubG9nKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdsb2dnZXIgbXVzdCBoYXZlICN3cml0ZSBvciAjbG9nIG1ldGhvZHMnXG5cblxuIyBFeHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IFMzQ2xpZW50XG5cbiJdfQ==
