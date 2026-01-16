#!/bin/bash
set -e

echo "=========================================="
echo "Deploying Docu-CR Frontend"
echo "=========================================="
echo ""

BACKEND_URL="${1:-https://docucrapi.medeye360.com/api/v1}"
REGION="us-east-1"
BUCKET_NAME="docucr.medeye360.com"

echo "Deployment Info:"
echo "   Backend URL: ${BACKEND_URL} $([ "$1" ] && echo "(custom)" || echo "(default)")"
echo "   Region: ${REGION}"
echo "   S3 Bucket: ${BUCKET_NAME}"
echo ""

cd "$(dirname "$0")/.."

# Create .env.production
echo "Creating .env.production..."
cat > .env.production << EOF
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
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --delete \
  --region ${REGION} \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
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
