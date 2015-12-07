# Node Amazon S3 Browser Direct Upload

`s3-browser-direct-upload` is a node.js library which gives you the ability to upload files to Amazon S3 easily using:

* browser/mobile-based straight-to-S3 uploads using POST
* S3.upload method
* S3.putObject method
* works with v4 signature version

In addition you can limit allowed file extensions.


![amazon s3 browser post](http://docs.aws.amazon.com/AmazonS3/latest/dev/images/s3_post.png)<br/>
Image source:http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingHTTPPOST.html

## Install
```npm install s3-browser-direct-upload```

## Usage examples

### Create a client
```
var s3BrowserDirectUpload = require('s3-browser-direct-upload');

var s3clientOptions = {
  accessKeyId: 'accessKeyId', // required
  secretAccessKey: 'secretAccessKey', // required
  region: 'eu-central-1', // required
  signatureVersion: 'v4' // optional
};

var allowedTypes = ['jpg', 'png'];

var s3client = new s3BrowserDirectUpload(s3clientOptions, allowedTypes); // allowedTypes is optional
```
For more information check API documentation.

### Upload using s3client.uploadPostForm (Browser-based uploads using POST)
```
var uploadPostFormOptions = {
  key: 'filename.ext', // required
  bucket: 'bucketName', // required
  extension: 'ext', // optional (pass if You want to check with allowed extensions or set ContentType)
  acl: 'public-read', // optional, default: 'public-read'
  expires: new Date('2018-01-01'), // optional (date object with expiration date for urls), default: +60 minutes
  algorithm: 'AWS4-HMAC-SHA256', // optional, default: 'AWS4-HMAC-SHA256'
  region: 'eu-central-1', // optional, default: s3client.region
  conditionMatching: [
    {"success_action_redirect": "http://google.com"},
    ["condition", "key", "pattern"]
  ] // optional
};

s3client.uploadPostForm(uploadPostFormOptions, function(err, params){
  console.log(params); // params contain all the data required to build browser-based form for direct upload (check API Documentation)
});
```
For more information check API documentation.

### Upload using s3client.upload (S3#upload)
```
var fs = require('fs');

var uploadOptions = {
  data: fs.createReadStream('/path/to/a/file'), // required
  key: 'filename.ext', // required
  bucket: 'bucketName', // required
  extension: 'ext', // optional (pass if You want to check with allowed extensions or set ContentType)
  acl: 'public-read' // optional
};

s3client.upload(uploadOptions, function(err, url) {
  console.log(url); // url to uploaded data
});
```
For more information check API documentation.

### Upload using s3client.put (S3#putObject)
```
var uploadOptions = {
  key: 'filename.ext', // required
  bucket: 'bucketName', // required
  extension: 'ext', // optional (pass if You want to check with allowed extensions or set ContentType)
  acl: 'public-read', // optional
  expires: new Date('2018-01-01') // optional (date object with expiration date for urls)
};

s3client.put(uploadOptions, function(err, data){
  console.log(data); // data contains public url and signed url
});
```
For more information check API documentation.

## API Documentation
### s3client constructor parameters
`options` (JSON or AWS.Config object):

* accessKeyId (String, required)
* secretAccessKey (String, required)
* region (String, required)
* signatureVersion (String, optional)
* maxRetries (Integer, optional)
* maxRedirects (Integer, optional)
* systemClockOffset (Number, optional)
* sslEnabled (Boolean, optional)
* paramValidation (Boolean, optional)
* computeChecksums (Boolean, optional)
* convertResponseTypes (Boolean, optional)
* s3ForcePathStyle (Boolean, optional)
* s3BucketEndpoint (Boolean, optional)
* httpOptions (JSON {proxy, agent, timeout, xhrAsync, xhrWithCredentials}, optional)
* apiVersions (JSON {versions}, optional)
* apiVersion (String/Date, optional)
* sessionToken (AWS.Credentials, optional)
* credentials (AWS.Credentials, optional)
* credentialProvider (AWS.CredentialsProviderChain, optional)
* logger (Logger object with #write,#log methods, optional)

`arrayOfAllowedTypes` (array of strings ex. ["jpg"])

### s3client.uploadPostForm
`options` (JSON):

* key (String, required)
* bucket (String, required)
* extension (String, optional)
* expires (String/Date, optional, default: +60 minutes)
* acl (String, optional, default: 'public-read')
* contentLength (Integer, optional)
* algorithm (String, optional, default: 'AWS4-HMAC-SHA256')
* region (String, optional, default: s3client.region)
* conditionMatching (Array, optional)

`callback` (err, params), returned params (JSON):

* params:
    - key
    - acl
    - x-amz-algorithm
    - x-amz-credential
    - x-amz-date
    - policy
    - x-amz-signature
    - content-type
* public_url
* form_url
* conditions

### s3client.upload
`options` (JSON):

* data (File, String, Buffer, ReadableStream, ..., required)
* key (String, required)
* bucket (String, required)
* extension (String, optional)
* expires (String/Date, optional)
* acl (String, optional)
* contentLength (Integer, optional)

`callback` (err, url), returned url (String)

### s3client.put
`options` (JSON):

* key (String, required)
* bucket (String, required)
* extension (String, optional)
* expires (String/Date, optional)
* acl (String, optional)

`callback` (err, urls), returned urls (JSON):

* urls:
    - signed_url
    - public_url

## License
MIT

Copyright Gabriel Oczkowski
