#!/bin/bash

# Lambda Layer 빌드 스크립트

echo "Building Lambda Layers..."

# Chromium Layer 빌드
echo "Building Chromium Layer..."
cd chromium
mkdir -p nodejs
npm install --production
mv node_modules nodejs/
zip -r ../chromium-layer.zip nodejs
rm -rf nodejs
cd ..

# Prisma Layer 빌드
echo "Building Prisma Layer..."
cd prisma
mkdir -p nodejs
npm install --production
npx prisma generate
cp -r node_modules/.prisma nodejs/
cp -r node_modules/@prisma nodejs/
zip -r ../prisma-layer.zip nodejs
rm -rf nodejs
cd ..

echo "Lambda Layers built successfully!"
echo "Files created:"
echo "  - chromium-layer.zip"
echo "  - prisma-layer.zip"