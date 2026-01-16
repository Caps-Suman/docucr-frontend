#!/bin/bash

# Destroy Docu-CR Frontend Infrastructure
# Usage: ./destroy.sh [region]

set -e

REGION=${1:-us-east-1}
BUCKET_NAME="your-frontend-bucket"

echo "WARNING: This will destroy ALL frontend infrastructure and data!"
echo "Region: $REGION"
echo "Bucket: $BUCKET_NAME"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Destruction cancelled."
    exit 0
fi

echo "Starting infrastructure destruction..."

# Try Terraform destroy first
echo "1. Attempting Terraform destroy..."
cd terraform
if terraform destroy -auto-approve; then
    echo "Terraform destroy completed successfully"
    cd ..
else
    echo "Terraform destroy failed, proceeding with manual cleanup..."
    cd ..
    
    # Manual cleanup
    echo "2. Getting CloudFront Distribution ID..."
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Origins.Items[?Id=='S3-${BUCKET_NAME}']].Id | [0]" \
        --output text \
        --region ${REGION})
    
    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
        echo "3. Disabling CloudFront distribution..."
        ETAG=$(aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --query 'ETag' --output text)
        aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --query 'DistributionConfig' > /tmp/dist-config.json
        jq '.Enabled = false' /tmp/dist-config.json > /tmp/dist-config-disabled.json
        aws cloudfront update-distribution --id $DISTRIBUTION_ID --distribution-config file:///tmp/dist-config-disabled.json --if-match $ETAG
        
        echo "4. Waiting for distribution to be disabled (this may take 10-15 minutes)..."
        aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
        
        echo "5. Deleting CloudFront distribution..."
        ETAG=$(aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --query 'ETag' --output text)
        aws cloudfront delete-distribution --id $DISTRIBUTION_ID --if-match $ETAG
        
        rm -f /tmp/dist-config*.json
    else
        echo "CloudFront distribution not found"
    fi
    
    echo "6. Emptying S3 bucket..."
    aws s3 rm s3://${BUCKET_NAME}/ --recursive --region ${REGION} || echo "S3 bucket not found or already empty"
    
    echo "7. Deleting S3 bucket..."
    aws s3 rb s3://${BUCKET_NAME}/ --region ${REGION} || echo "S3 bucket not found"
fi

echo ""
echo "Destruction completed!"
echo ""
echo "Note: CloudFront distributions may take a few minutes to fully delete."
echo "You can verify cleanup with:"
echo "  aws s3 ls | grep ${BUCKET_NAME}"
echo "  aws cloudfront list-distributions --region $REGION"
