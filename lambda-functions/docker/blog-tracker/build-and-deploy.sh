#!/bin/bash

# Set variables
AWS_REGION="ap-northeast-2"
AWS_ACCOUNT_ID="551765812577"
ECR_REPOSITORY="marketingplat/blog-tracker-lambda"
IMAGE_TAG="latest"
FUNCTION_NAME="marketingplat-tracking-production-blogTracker"

echo "===== Starting Container Image Lambda Build and Deploy ====="

# Step 1: Get ECR login token
echo "Step 1: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 2: Build Docker image
echo "Step 2: Building Docker image..."
docker build -t $ECR_REPOSITORY .

# Step 3: Tag image for ECR
echo "Step 3: Tagging image for ECR..."
docker tag $ECR_REPOSITORY:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Step 4: Push image to ECR
echo "Step 4: Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Step 5: Update Lambda function to use container image
echo "Step 5: Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG \
    --region $AWS_REGION

echo "===== Deployment Complete! ====="
echo "Function: $FUNCTION_NAME"
echo "Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"