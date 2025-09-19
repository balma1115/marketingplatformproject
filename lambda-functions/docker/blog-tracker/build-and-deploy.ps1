# PowerShell script for building and deploying Container Image Lambda

# Set variables
$AWS_REGION = "ap-northeast-2"
$AWS_ACCOUNT_ID = "551765812577"
$ECR_REPOSITORY = "marketingplat/blog-tracker-lambda"
$IMAGE_TAG = "latest"
$FUNCTION_NAME = "marketingplat-tracking-production-blogTracker"

Write-Host "===== Starting Container Image Lambda Build and Deploy =====" -ForegroundColor Green

# Step 1: Get ECR login token
Write-Host "Step 1: Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Step 2: Build Docker image
Write-Host "Step 2: Building Docker image..." -ForegroundColor Yellow
docker build -t $ECR_REPOSITORY .

# Step 3: Tag image for ECR
Write-Host "Step 3: Tagging image for ECR..." -ForegroundColor Yellow
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

# Step 4: Push image to ECR
Write-Host "Step 4: Pushing image to ECR..." -ForegroundColor Yellow
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

# Step 5: Update Lambda function to use container image
Write-Host "Step 5: Updating Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $FUNCTION_NAME `
    --image-uri "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}" `
    --region $AWS_REGION

Write-Host "===== Deployment Complete! =====" -ForegroundColor Green
Write-Host "Function: $FUNCTION_NAME"
Write-Host "Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"