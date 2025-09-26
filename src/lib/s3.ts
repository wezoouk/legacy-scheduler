import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION!;
const Bucket = process.env.AWS_S3_BUCKET!;

export const s3 = new S3Client({ 
  region, 
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!, 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function getPresignedPutUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ 
    Bucket, 
    Key: key, 
    ContentType: contentType 
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
  return { url, key, bucket: Bucket, region };
}

export function getS3ObjectUrl(key: string): string {
  return `https://${Bucket}.s3.${region}.amazonaws.com/${key}`;
}