# Naver Search Ads API - Comprehensive Analysis & Implementation Guide

*Last Updated: January 2025*

Based on official documentation research from [naver.github.io/searchad-apidoc](https://naver.github.io/searchad-apidoc/) and analysis of real-world implementation patterns.

## 🎯 Executive Summary

The Naver SearchAd API is **significantly more limited** than initially assumed. After thorough research, most advanced campaign types require manual setup through the Naver Ads UI, and the API is primarily designed for **PowerLink (search ad) automation** rather than comprehensive campaign management.

### Key Findings:
- ✅ **PowerLink campaigns**: Full API support
- ❌ **Brand Search**: Requires special approval + manual setup  
- ❌ **Place campaigns**: Requires business verification + SME status
- ❌ **Shopping campaigns**: Requires Merchant Center integration
- ⚠️ **Power Contents**: Limited API support

## 🏗️ API Architecture

### Base Configuration
```javascript
const API_BASE_URL = 'https://api.searchad.naver.com'
const API_VERSION = '/ncc' // Naver Content Commerce
```

### Authentication Requirements
The API uses **HMAC-SHA256 signature authentication** (similar to AWS):

```javascript
// Required credentials
{
  "accessKey": "YOUR_ACCESS_KEY",      // From API Manager
  "secretKey": "YOUR_SECRET_KEY",      // From API Manager  
  "customerId": "YOUR_CUSTOMER_ID"     // Your advertiser ID
}

// Required headers for each request
{
  "X-Timestamp": timestamp,
  "X-API-KEY": accessKey,
  "X-Customer": customerId,
  "X-Signature": hmac_sha256_signature
}
```

### Signature Generation Process
```javascript
// Pseudo-code for signature generation
const stringToSign = `${httpMethod}\n${uri}\n${timestamp}\n${accessKey}\n${customerId}`
const signature = base64(hmac_sha256(secretKey, stringToSign))
```

## 📊 Campaign Types - Reality Check

### 1. PowerLink (파워링크) ✅ **FULLY SUPPORTED**
**Type**: Keyword-based search ads
**API Support**: Complete CRUD operations

```javascript
// PowerLink Campaign Structure
{
  "campaignTp": "WEB_SITE",           // Fixed value
  "name": "캠페인명",
  "customerId": 123456,
  "dailyBudget": 10000,               // Optional
  "deliveryMethod": "STANDARD",       // or "ACCELERATED" 
  "useDailyBudget": true,
  "status": "ENABLED",                // or "PAUSED"
  "trackingMode": "TRACKING_DISABLED" // or "CONVERSION_TRACKING"
}
```

**Supported Operations**:
- ✅ Create/update/delete campaigns
- ✅ Create/update/delete ad groups  
- ✅ Add/modify keywords with bidding
- ✅ Create text ads (TEXT_45 and RSA_AD types)
- ✅ Set targeting (time, region, device)
- ✅ Performance reporting

### 2. Shopping Search (쇼핑검색) ⚠️ **LIMITED SUPPORT**
**Type**: Product shopping ads
**API Support**: Basic operations only

```javascript
// Shopping Campaign Constraints
{
  "campaignTp": "SHOPPING",
  "requiredPrerequisites": [
    "Naver Shopping Store Registration",
    "Product Feed Setup via Merchant Center",
    "Manual category mapping"
  ],
  "limitations": [
    "No keyword targeting (auto-placement only)",
    "Product feed must be managed outside API",
    "Category mapping requires manual setup"
  ]
}
```

**What's Possible**:
- ✅ Create shopping campaigns (after manual setup)
- ✅ Adjust bids on existing products
- ✅ Performance reporting
- ❌ Product feed management
- ❌ Category assignments
- ❌ Keyword-based targeting

### 3. Brand Search (브랜드검색) ❌ **NOT SUPPORTED VIA API**
**Type**: Brand keyword priority ads  
**API Support**: None - Manual setup required

**Requirements**:
- Special approval from Naver
- Minimum budget: ₩500,000/month (~$380 USD)
- Campaign duration: 7-90 days only
- Manual brand verification process

**Reality**: Cannot be created or managed via API

### 4. Place (플레이스) ❌ **NOT SUPPORTED VIA API**  
**Type**: Local business location ads
**API Support**: None - Requires business verification

**Requirements**:
- Korean SME company registration
- Physical business verification
- Manual approval process
- CPM pricing only (₩1 per impression)

**Reality**: Cannot be created via API, requires manual verification

### 5. Power Contents (파워컨텐츠) ⚠️ **VERY LIMITED**
**Type**: Content network display ads
**API Support**: Basic operations only

**Limitations**:
- No creative upload via API
- Limited targeting options
- Most configurations require manual setup

## 🔧 Realistic API Endpoints

Based on official Java samples and documentation:

### Campaign Management
```javascript
// List campaigns
GET /ncc/campaigns?customerId={customerId}

// Update campaign (Note: Cannot create campaigns directly)
PUT /ncc/campaigns/{campaignId}
```

### Ad Group Management  
```javascript
// Create ad group (within existing campaign)
POST /ncc/adgroups
{
  "campaignId": 12345,
  "name": "Ad Group Name", 
  "dailyBudget": 5000,
  "useDailyBudget": true,
  "contentsNetworkBidAmt": 100,
  "mobileNetworkBidAmt": 120,
  "pcNetworkBidAmt": 110
}

// List ad groups
GET /ncc/adgroups?customerId={customerId}&campaignId={campaignId}

// Update ad group
PUT /ncc/adgroups/{adgroupId}

// Delete ad group  
DELETE /ncc/adgroups/{adgroupId}
```

### Keyword Management
```javascript
// Add keywords to ad group
POST /ncc/keywords
{
  "nccAdgroupId": 67890,
  "nccKeywordList": [
    {
      "keyword": "영어학원",
      "bidAmt": 150,
      "useGroupBidAmt": false
    }
  ]
}

// Update keyword bids
PUT /ncc/keywords
{
  "nccKeywordList": [
    {
      "nccKeywordId": 11111,
      "bidAmt": 200
    }
  ]
}

// List keywords  
GET /ncc/keywords?nccAdgroupId={adgroupId}

// Delete keywords
DELETE /ncc/keywords?nccKeywordIdList={id1,id2}
```

### Ad Management
```javascript
// Create text ad
POST /ncc/ads
{
  "nccAdgroupId": 67890,
  "adTp": "TEXT_45",  // or "RSA_AD" for responsive
  "headline": "최고의 영어학원",
  "description": "전문 강사진과 함께하는 맞춤형 영어교육",
  "pc": {
    "final": "https://example.com/landing",
    "mobile": "https://m.example.com/landing"
  }
}

// List ads
GET /ncc/ads?nccAdgroupId={adgroupId}

// Update ad
PUT /ncc/ads/{adId}

// Delete ad
DELETE /ncc/ads/{adId}
```

### Reporting
```javascript
// Get campaign statistics  
GET /ncc/stat?fromDate=2025-01-01&toDate=2025-01-31&entity=CAMPAIGN

// Get keyword performance
GET /ncc/stat?fromDate=2025-01-01&toDate=2025-01-31&entity=KEYWORD
```

## 🎯 What Can Actually Be Built

### ✅ Realistic Features for API Implementation

1. **PowerLink Campaign Automation**
   - Keyword research and bid management
   - Ad group organization and optimization
   - Performance monitoring and reporting
   - Automated bid adjustments based on performance

2. **Keyword Management Dashboard**
   - Add/remove keywords in bulk
   - Bid optimization suggestions
   - Performance tracking over time
   - Competitive analysis (based on bid estimates)

3. **Ad Copy Testing**
   - A/B testing different ad variations
   - Performance comparison reports
   - Automated pausing of underperforming ads

4. **Budget Management**
   - Daily budget monitoring
   - Spend pacing alerts
   - ROI-based budget reallocation

5. **Reporting Dashboard**
   - Campaign performance overview
   - Keyword-level analytics
   - Custom date range reports
   - Export functionality

### ❌ Features That Should Be Removed

1. **Multi-Campaign Type Creator**
   - Remove Brand Search campaign options
   - Remove Place campaign setup
   - Remove complex Shopping setup wizards

2. **Advanced Targeting UI**
   - Remove audience targeting (not supported)
   - Remove demographic targeting options
   - Remove interest-based targeting

3. **Creative Management**
   - Remove image/banner upload features
   - Remove video ad creation tools
   - Remove display network campaign setup

## 📋 Step-by-Step Implementation Guide

### Phase 1: Basic PowerLink Management
```javascript
1. Implement HMAC-SHA256 authentication
2. Create campaign listing interface
3. Build ad group CRUD operations
4. Implement keyword management
5. Add basic text ad creation
```

### Phase 2: Automation Features  
```javascript
1. Keyword bid optimization algorithms
2. Performance monitoring dashboard
3. Automated reporting system
4. Budget management tools
```

### Phase 3: Advanced Analytics
```javascript
1. Keyword performance trends
2. Competitor bid analysis
3. ROI optimization suggestions
4. Custom report builder
```

## 🚧 Implementation Constraints & Gotchas

### 1. Authentication Complexity
```javascript
// The HMAC signature is complex and must be perfect
// Any small error results in authentication failure
// Consider using official SDK if available
```

### 2. Rate Limiting
```javascript
// Maximum 10 pages can be retrieved per API call
// Rate limits are strictly enforced
// Implement proper retry logic with exponential backoff
```

### 3. Character Limits & Restrictions
```javascript
// Single-byte and double-byte characters treated equally
// Keywords cannot appear more than twice in descriptions
// Strict character limits on ad copy
```

### 4. Minimum Requirements
```javascript
// Minimum keyword bid: ₩70 (~$0.05)
// Maximum keyword bid: ₩100,000 (~$75)
// Some features require minimum daily budgets
```

### 5. Korean Market Specifics
```javascript
// Website verification required by Naver staff
// Cannot advertise different websites with one account
// Content must comply with Korean advertising standards
```

## 💡 Recommended Architecture

### Simplified Campaign Management System
```javascript
// Focus ONLY on PowerLink campaigns
const supportedCampaignTypes = ['POWERLINK']

// Remove all unsupported features
const removedFeatures = [
  'brandSearchSetup',
  'placeAdvertising', 
  'shoppingFeedManagement',
  'displayBannerCreation',
  'audienceTargeting'
]
```

### Core Module Structure
```javascript
src/
├── api/
│   ├── auth/           // HMAC-SHA256 authentication
│   ├── campaigns/      // PowerLink campaigns only
│   ├── adgroups/       // Ad group management  
│   ├── keywords/       // Keyword CRUD operations
│   ├── ads/           // Text ad management
│   └── reports/       // Performance reporting
├── components/
│   ├── campaigns/     // Campaign dashboard
│   ├── keywords/      // Keyword management UI
│   ├── ads/          // Ad creation interface
│   └── reports/      // Analytics dashboard
└── utils/
    ├── validation.js  // Korean text validation
    ├── formatting.js  // Currency/date formatting
    └── constants.js   // API limits & constraints
```

## 🎯 Final Recommendations

### What to Build
1. **PowerLink-focused platform** with keyword automation
2. **Performance analytics** with ROI optimization
3. **Bulk keyword management** with bid automation
4. **Simple ad copy testing** framework

### What NOT to Build  
1. ❌ Multi-campaign-type wizards
2. ❌ Brand Search integration
3. ❌ Place advertising features  
4. ❌ Shopping feed management
5. ❌ Display banner creators
6. ❌ Advanced audience targeting

### Development Priority
1. **High**: PowerLink automation (full API support)
2. **Medium**: Basic Shopping campaign management (limited support)
3. **Low**: Power Contents (very limited support)
4. **None**: Brand Search, Place advertising (no API support)

---

**Conclusion**: The Naver SearchAd API is primarily designed for **PowerLink campaign automation**. Any implementation should focus on keyword-based search advertising with robust performance tracking. Attempting to build features for unsupported campaign types will result in a poor user experience and technical debt.

**Next Steps**: 
1. Remove all unsupported features from current implementation
2. Focus development resources on PowerLink optimization tools
3. Build a solid HMAC authentication system
4. Create comprehensive keyword management interface
5. Implement performance analytics dashboard

This analysis reflects the **real capabilities** of the Naver SearchAd API as of January 2025, based on official documentation and implementation samples.