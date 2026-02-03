# Frontend Deployment

This directory contains all deployment-related files for the React frontend.

## Structure

```
deploy/
├── terraform/          # Infrastructure as Code
│   ├── main.tf        # S3 + CloudFront configuration
│   └── README.md      # Terraform usage guide
├── deploy.sh          # Application deployment script
├── destroy.sh         # Infrastructure destruction script
└── README.md          # This file
```

## Quick Deploy

### First Time Setup

1. **Deploy Infrastructure** (S3 + CloudFront):
   ```bash
   cd deploy/terraform
   terraform init
   terraform apply
   ```

2. **Deploy Application**:
   ```bash
   cd ..
   ./deploy.sh https://your-backend-api.com
   ```

### Subsequent Deployments

For code changes only:
```bash
cd deploy
./deploy.sh https://your-backend-api.com
```

## Scripts

### `deploy.sh` - Application Deployment

Builds and deploys the React application to S3/CloudFront.

**Usage**:
```bash
./deploy.sh [BACKEND_URL]
```

**Examples**:
```bash
# Use default backend URL
./deploy.sh

# Use custom backend URL
./deploy.sh https://api.client.com
```

**What it does**:
1. Creates `.env.production` with backend URL
2. Installs npm dependencies
3. Builds React app (`npm run build`)
4. Uploads to S3 bucket
5. Invalidates CloudFront cache
6. Shows deployment URL

### `destroy.sh` - Infrastructure Destruction

Destroys all frontend infrastructure (S3 bucket and CloudFront distribution).

**Usage**:
```bash
./destroy.sh [region]
```

**Example**:
```bash
./destroy.sh us-east-1
```

**Warning**: This permanently deletes all data!

## Deployment Workflow

### Development to Production

```bash
# 1. Test locally
cd frontend
npm run dev

# 2. Deploy infrastructure (first time only)
cd deploy/terraform
terraform apply

# 3. Deploy application
cd ..
./deploy.sh https://your-backend-api.com

# 4. Verify deployment
curl https://your-cloudfront-url.cloudfront.net
```

### Update Existing Deployment

```bash
# Make code changes in frontend/src/

# Deploy updated code
cd deploy
./deploy.sh https://your-backend-api.com
```

## Multi-Client Deployment

### Option 1: Separate Terraform Directories

```bash
# Client 1
cd deploy/terraform-client1
terraform apply
cd ..
./deploy.sh https://api.client1.com

# Client 2
cd deploy/terraform-client2
terraform apply
cd ..
./deploy.sh https://api.client2.com
```

### Option 2: Terraform Workspaces

```bash
# Client 1
cd deploy/terraform
terraform workspace new client1
terraform apply
cd ..
./deploy.sh https://api.client1.com

# Client 2
cd deploy/terraform
terraform workspace select client2
terraform apply
cd ..
./deploy.sh https://api.client2.com
```

## Configuration

### Backend URL

The backend URL is set during deployment via the `deploy.sh` script:

```bash
./deploy.sh https://api.example.com
```

This creates `.env.production`:
```env
VITE_API_URL=https://api.example.com
```

### S3 Bucket Name

Set in `terraform/terraform.tfvars`:
```hcl
bucket_name = "your-app-frontend"
```

### Custom Domain

Set in `terraform/terraform.tfvars`:
```hcl
domain_name     = "app.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:..."
```

## Monitoring

### Check Deployment Status

```bash
# Get CloudFront distribution info
cd terraform
terraform output

# Check S3 bucket contents
aws s3 ls s3://your-bucket-name/

# Check CloudFront invalidations
aws cloudfront list-invalidations --distribution-id YOUR_DIST_ID
```

### View Logs

CloudFront access logs (if enabled):
```bash
aws s3 ls s3://your-logs-bucket/
```

## Troubleshooting

### Deployment Script Fails

**Error**: `CloudFront distribution not found`

**Fix**: Deploy infrastructure first:
```bash
cd terraform
terraform apply
```

### Old Content Still Showing

**Cause**: CloudFront cache not invalidated

**Fix**: Manual invalidation:
```bash
cd terraform
DIST_ID=$(terraform output -raw distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Build Fails

**Error**: `npm install` or `npm run build` fails

**Fix**: 
1. Check Node.js version (requires 18+)
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

### Wrong Backend URL

**Fix**: Redeploy with correct URL:
```bash
./deploy.sh https://correct-backend-url.com
```

### Access Denied Error on CloudFront URL

**Error**: Browser shows `<Error><Code>AccessDenied</Code></Error>`

**Cause**: S3 bucket policy missing or incorrect

**Fix**: Apply bucket policy manually:
```bash
# Get your distribution ID
cd terraform
DIST_ID=$(terraform output -raw distribution_id)
BUCKET=$(terraform output -raw bucket_name)

# Get CloudFront ARN
CF_ARN=$(aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.ARN' --output text)

# Create bucket policy
cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "${CF_ARN}"
        }
      }
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy --bucket $BUCKET --policy file:///tmp/bucket-policy.json

# Invalidate cache
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## Cost Optimization

### Development
- Use CloudFront default domain (no custom domain)
- Minimal traffic = ~$1-2/month

### Production
- Custom domain with SSL
- Higher traffic = ~$5-10/month
- Enable CloudFront logging for monitoring

## Security

### Best Practices
1. **Never commit** `.env.production` or `terraform.tfvars`
2. **Use HTTPS** for all deployments (enforced by CloudFront)
3. **Enable S3 versioning** (already configured)
4. **Restrict S3 access** to CloudFront only (already configured)
5. **Use custom domains** with SSL certificates

### Security Headers
Already configured in Terraform:
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy
        run: |
          cd frontend/deploy
          ./deploy.sh ${{ secrets.BACKEND_URL }}
```

## Backup and Recovery

### S3 Versioning
Already enabled - previous versions retained automatically.

### Rollback to Previous Version
```bash
# List versions
aws s3api list-object-versions --bucket your-bucket-name

# Restore specific version
aws s3api copy-object \
  --copy-source your-bucket-name/index.html?versionId=VERSION_ID \
  --bucket your-bucket-name \
  --key index.html
```

### Terraform State Backup
```bash
cd terraform
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d)
```

## Next Steps

1. **Review Terraform README**: `terraform/README.md` for infrastructure details
2. **Configure custom domain**: Update `terraform/terraform.tfvars`
3. **Set up CI/CD**: Automate deployments
4. **Enable monitoring**: CloudWatch metrics and alarms
5. **Test deployment**: Verify frontend connects to backend

## Support

For detailed infrastructure documentation, see:
- `terraform/README.md` - Complete Terraform guide
- `../README.md` - Project overview
