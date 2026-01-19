#!/bin/bash
set -e

echo "=========================================="
echo "Deploying Docu-CR Frontend"
echo "=========================================="
echo ""

BACKEND_URL="${1:-https://docucrapi.medeye360.com}"
REGION="us-east-1"
BUCKET_NAME="docucr.medeye360.com"

echo "Deployment Info:"
echo "   Backend URL: ${BACKEND_URL} $([ "$1" ] && echo "(custom)" || echo "(default)")"
echo "   Region: ${REGION}"
echo "   S3 Bucket: ${BUCKET_NAME}"
echo ""

cd "$(dirname "$0")/.."

# Temporarily hide .env.local so it doesn't override production settings
if [ -f .env.local ]; then
  echo "Temporarily moving .env.local to .env.local.bak to ensure clean production build..."
  mv .env.local .env.local.bak
  trap 'mv .env.local.bak .env.local' EXIT
fi

# Create .env.production
echo "Creating .env.production..."
cat > .env.production << EOF
REACT_APP_API_URL=${BACKEND_URL}
VITE_API_URL=${BACKEND_URL}
EOF

# Install dependencies
echo "Installing dependencies..."
npm install

# Build
echo "Building frontend..."
npm run build

# Get CloudFront Distribution ID
echo "Getting CloudFront Distribution ID..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?Id=='S3-${BUCKET_NAME}']].Id | [0]" \
  --output text \
  --region ${REGION})

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
  echo "Error: CloudFront distribution not found for bucket ${BUCKET_NAME}"
  echo "Please run terraform apply first in the terraform/ directory"
  exit 1
fi

echo "   Distribution ID: ${DISTRIBUTION_ID}"
echo ""

# Upload to S3
echo "Uploading to S3..."
aws s3 sync build/ s3://${BUCKET_NAME}/ \
  --delete \
  --region ${REGION} \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp build/index.html s3://${BUCKET_NAME}/index.html \
  --region ${REGION} \
  --cache-control "no-cache"

# Invalidate CloudFront
echo "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "   Invalidation ID: ${INVALIDATION_ID}"
echo ""

# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudfront get-distribution \
  --id ${DISTRIBUTION_ID} \
  --query 'Distribution.DomainName' \
  --output text)

echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "CloudFront URL: https://${CLOUDFRONT_URL}"
echo "Backend API: ${BACKEND_URL}"
echo ""
echo "CloudFront invalidation in progress..."
echo "   Check status: aws cloudfront get-invalidation --distribution-id ${DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
echo ""
