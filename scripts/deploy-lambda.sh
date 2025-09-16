#!/bin/bash

# Lambda Deployment Script for MarketingPlat
# This script deploys Lambda functions to AWS

set -e

# Configuration
REGION="ap-northeast-2"
ACCOUNT_ID="YOUR_ACCOUNT_ID"  # Replace with your AWS account ID
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MarketingPlat Lambda Deployment Script ===${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Function to deploy a Lambda function
deploy_lambda() {
    local FUNCTION_NAME=$1
    local FUNCTION_DIR=$2
    local HANDLER=$3
    local DESCRIPTION=$4

    echo -e "${YELLOW}Deploying ${FUNCTION_NAME}...${NC}"

    # Navigate to function directory
    cd "${FUNCTION_DIR}"

    # Install dependencies
    echo "Installing dependencies..."
    npm install --production

    # Copy Prisma schema and generate client
    cp ../../prisma/schema.prisma ./
    npx prisma generate

    # Create deployment package
    echo "Creating deployment package..."
    zip -rq function.zip . -x "*.git*" -x "*.sh" -x "test*"

    # Check if function exists
    if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" 2>/dev/null; then
        # Update existing function
        echo "Updating existing function..."
        aws lambda update-function-code \
            --function-name "${FUNCTION_NAME}" \
            --zip-file fileb://function.zip \
            --region "${REGION}"

        # Update function configuration
        aws lambda update-function-configuration \
            --function-name "${FUNCTION_NAME}" \
            --timeout 120 \
            --memory-size 1024 \
            --environment "Variables={DATABASE_URL=${DATABASE_URL}}" \
            --region "${REGION}"
    else
        # Create new function
        echo "Creating new function..."
        aws lambda create-function \
            --function-name "${FUNCTION_NAME}" \
            --runtime nodejs18.x \
            --role "${LAMBDA_ROLE_ARN}" \
            --handler "${HANDLER}" \
            --description "${DESCRIPTION}" \
            --timeout 120 \
            --memory-size 1024 \
            --environment "Variables={DATABASE_URL=${DATABASE_URL}}" \
            --zip-file fileb://function.zip \
            --region "${REGION}"
    fi

    # Clean up
    rm -f function.zip schema.prisma

    echo -e "${GREEN}✓ ${FUNCTION_NAME} deployed successfully${NC}"
    echo ""
}

# Deploy SmartPlace Tracker
deploy_lambda \
    "marketingplat-smartplace-tracker" \
    "lambda/smartplace-tracker" \
    "index.handler" \
    "Tracks SmartPlace keyword rankings on Naver Map"

# Deploy Blog Tracker
deploy_lambda \
    "marketingplat-blog-tracker" \
    "lambda/blog-tracker" \
    "index.handler" \
    "Tracks blog keyword rankings on Naver Search"

# Create Lambda Layers (if needed)
echo -e "${YELLOW}Creating Lambda Layers...${NC}"

# Create Chromium Layer
mkdir -p lambda-layers/chromium/nodejs
cd lambda-layers/chromium
npm install @sparticuz/chromium
cd nodejs
zip -rq ../chromium-layer.zip .
cd ..

# Publish Chromium Layer
aws lambda publish-layer-version \
    --layer-name marketingplat-chromium-layer \
    --description "Chromium binary for Puppeteer" \
    --zip-file fileb://chromium-layer.zip \
    --compatible-runtimes nodejs18.x nodejs20.x \
    --region "${REGION}"

# Clean up
cd ../..
rm -rf lambda-layers

# Set up SQS triggers (if SQS queues exist)
echo -e "${YELLOW}Setting up SQS triggers...${NC}"

# SmartPlace queue trigger
SMARTPLACE_QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:smartplace-tracking-queue"
if aws sqs get-queue-url --queue-name smartplace-tracking-queue --region "${REGION}" 2>/dev/null; then
    aws lambda create-event-source-mapping \
        --function-name marketingplat-smartplace-tracker \
        --event-source-arn "${SMARTPLACE_QUEUE_ARN}" \
        --batch-size 5 \
        --region "${REGION}" 2>/dev/null || echo "SmartPlace trigger already exists"
fi

# Blog queue trigger
BLOG_QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:blog-tracking-queue"
if aws sqs get-queue-url --queue-name blog-tracking-queue --region "${REGION}" 2>/dev/null; then
    aws lambda create-event-source-mapping \
        --function-name marketingplat-blog-tracker \
        --event-source-arn "${BLOG_QUEUE_ARN}" \
        --batch-size 5 \
        --region "${REGION}" 2>/dev/null || echo "Blog trigger already exists"
fi

echo -e "${GREEN}=== Lambda Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in AWS Lambda console"
echo "2. Set up CloudWatch alarms for monitoring"
echo "3. Test the functions with sample events"
echo ""