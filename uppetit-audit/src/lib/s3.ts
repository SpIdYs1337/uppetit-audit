import S3 from 'aws-sdk/clients/s3';

let cleanEndpoint = (process.env.S3_ENDPOINT || 'https://s3.beget.com').trim();
if (cleanEndpoint.endsWith('/')) cleanEndpoint = cleanEndpoint.slice(0, -1);

const accessKey = (process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '').trim();
const secretKey = (process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '').trim();

export const s3Client = new S3({
  endpoint: cleanEndpoint,
  accessKeyId: accessKey || 'MISSING_ACCESS_KEY',
  secretAccessKey: secretKey || 'MISSING_SECRET_KEY',
  region: (process.env.S3_REGION || 'ru-1').trim(),
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});