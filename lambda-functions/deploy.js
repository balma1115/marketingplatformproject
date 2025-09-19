#!/usr/bin/env node

const { execSync } = require('child_process');

// Set environment variables
process.env.DATABASE_URL = "postgresql://postgres:Asungmini77A@marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com:5432/marketingplat";
process.env.LAMBDA_SECURITY_GROUP_ID = "sg-0584fd2a2cc9d17e1";
process.env.LAMBDA_SUBNET_ID_1 = "subnet-0d07a6427c0454dc7";
process.env.LAMBDA_SUBNET_ID_2 = "subnet-00a38eb1a1c14c391";
// AWS_REGION is automatically set by Lambda, don't set it manually

console.log('========================================');
console.log('Environment Variables Set:');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`LAMBDA_SECURITY_GROUP_ID: ${process.env.LAMBDA_SECURITY_GROUP_ID}`);
console.log(`LAMBDA_SUBNET_ID_1: ${process.env.LAMBDA_SUBNET_ID_1}`);
console.log(`LAMBDA_SUBNET_ID_2: ${process.env.LAMBDA_SUBNET_ID_2}`);
// AWS_REGION is automatically provided by Lambda
console.log('========================================\n');

// Check AWS Credentials
console.log('Checking AWS Credentials:');
try {
  execSync('aws sts get-caller-identity', { stdio: 'inherit' });
} catch (error) {
  console.log('AWS CLI not configured or not installed. Continuing with deployment...\n');
}

// Deploy with Serverless Framework
console.log('\nDeploying with Serverless Framework:');
try {
  execSync('npx serverless deploy --stage production --verbose', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Deployment successful!');
} catch (error) {
  console.error('\n❌ Deployment failed');
  process.exit(1);
}