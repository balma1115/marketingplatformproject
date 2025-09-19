#!/bin/bash

# Chromium Layer 생성
mkdir -p layers/chromium/nodejs
cd layers/chromium/nodejs
npm init -y
npm install @sparticuz/chromium@119.0.2
cd ../..
zip -r chromium-layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --compatible-runtimes nodejs18.x \
  --zip-file fileb://chromium-layer.zip \
  --region ap-northeast-2

# Puppeteer Layer 생성
mkdir -p layers/puppeteer/nodejs
cd layers/puppeteer/nodejs
npm init -y
npm install puppeteer-core@21.6.0
cd ../..
zip -r puppeteer-layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name puppeteer-layer \
  --compatible-runtimes nodejs18.x \
  --zip-file fileb://puppeteer-layer.zip \
  --region ap-northeast-2