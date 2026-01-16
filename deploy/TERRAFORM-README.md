# Terraform Infrastructure - Frontend

This directory contains Terraform configuration for deploying the React frontend on AWS using S3 and CloudFront.

## What Terraform Creates

### Storage
- **S3 Bucket**: Hosts static website files (HTML, CSS, JS, assets)
- **Bucket Versioning**: Enabled for file history
- **Encryption**: AES256 server-side encryption
- **Public Access Block**: Prevents accidental public exposure

### Content Delivery
- **CloudFront Distribution**: Global CDN for fast content delivery
- **Origin Access Control (OAC)**: Secure S3 access (replaces legacy OAI)
- **SSL/TLS**: HTTPS support with custom domain or CloudFront certificate
- **Cache Behaviors**: Optimized caching for assets and HTML

### Security
- **Response Headers Policy**: Security headers (HSTS, X-Frame-Options, etc.)
- **Bucket Policy**: Restricts access to CloudFront only
- **HTTPS Redirect**: Forces secure connections

### Error Handling
- **Custom Error Pages**: SPA routing support (404/403 → index.html)

## File Structure

```
terraform/
├── main.tf              # All infrastructure in one file
├── terraform.tfvars     # Your configuration (gitignored)
└── README.md           # This file
```

## Initial Setup

### 1. Configure Variables

Create `terraform.tfvars`:
```hcl
aws_region      = "us-east-1"
bucket_name     = "your-app-frontend"
domain_name     = ""              # Optional: "app.yourdomain.com"
certificate_arn = ""              # Optional: ACM certificate ARN
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Deploy Infrastructure

```bash
terraform plan
terraform apply
```

Type `yes` to confirm. Takes ~5-10 minutes.

### 4. Get Outputs

```bash
terraform output
```

Outputs:
- `cloudfront_url`: CloudFront distribution URL
- `distribution_id`: For cache invalidation
- `bucket_name`: S3 bucket name
- `custom_domain_url`: Your custom domain (if configured)

## Deploying for a New Client

### Option 1: Separate AWS Account (Recommended)

**Best for**: Complete isolation, separate billing

1. **Create new AWS account** for the client
2. **Configure AWS CLI**:
   ```bash
   aws configure --profile client-name
   export AWS_PROFILE=client-name
   ```
3. **Copy terraform directory**:
   ```bash
   cp -r terraform terraform-client-name
   cd terraform-client-name
   ```
4. **Create terraform.tfvars**:
   ```hcl
   bucket_name = "client-name-app"
   domain_name = "app.client-domain.com"  # Optional
   certificate_arn = "arn:aws:acm:us-east-1:..."  # Optional
   ```
5. **Deploy**:
   ```bash
   terraform init
   terraform apply
   ```

### Option 2: Same AWS Account, Different Bucket

**Best for**: Multiple clients, shared AWS account

1. **Copy terraform directory**:
   ```bash
   cp -r terraform terraform-client-name
   cd terraform-client-name
   ```
2. **Create terraform.tfvars**:
   ```hcl
   bucket_name = "client-name-app"  # MUST be globally unique
   domain_name = "app.client-domain.com"
   certificate_arn = "arn:aws:acm:us-east-1:..."
   ```
3. **Deploy**:
   ```bash
   terraform init
   terraform apply
   ```

### Option 3: Terraform Workspaces

**Best for**: Same codebase, multiple deployments

```bash
# Create workspace
terraform workspace new client-name

# Switch to workspace
terraform workspace select client-name

# Update terraform.tfvars
# Deploy
terraform apply
```

## Key Variables to Change Per Client

### Required Changes
```hcl
bucket_name = "client-name-app"  # MUST be globally unique across ALL AWS
```

### Optional Changes
```hcl
domain_name     = "app.client.com"           # Custom domain
certificate_arn = "arn:aws:acm:..."          # SSL certificate
aws_region      = "us-west-2"                # Different region
```

### What Stays the Same
- CloudFront configuration
- Cache policies
- Security headers
- Error handling (SPA routing)

## Important Notes

### S3 Bucket Naming
- **Must be globally unique** across all AWS accounts
- Use format: `{client-name}-{app-name}` or `{domain-name}`
- Examples: `acme-docucr`, `docucr.acme.com`

### Custom Domain Setup

**Prerequisites**:
1. Domain registered (Route53 or external)
2. SSL certificate in ACM (us-east-1 region for CloudFront)
3. DNS access for CNAME/Alias record

**Steps**:
1. **Request SSL Certificate** (if not exists):
   ```bash
   aws acm request-certificate \
     --domain-name app.client.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**: Add DNS records shown in ACM console

3. **Update terraform.tfvars**:
   ```hcl
   domain_name     = "app.client.com"
   certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
   ```

4. **Apply Terraform**:
   ```bash
   terraform apply
   ```

5. **Add DNS Record**: Point domain to CloudFront
   ```bash
   # Get CloudFront domain
   terraform output cloudfront_url
   
   # Create CNAME in Route53 or your DNS provider
   app.client.com → d1234abcd.cloudfront.net
   ```

### CloudFront Cache Invalidation

After deploying new code, invalidate cache:
```bash
# Get distribution ID
DIST_ID=$(terraform output -raw distribution_id)

# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

The `deploy.sh` script does this automatically.

## Common Commands

### View Current State
```bash
terraform show
```

### Get Outputs
```bash
terraform output cloudfront_url
terraform output distribution_id
terraform output bucket_name
```

### Update Infrastructure
```bash
terraform plan
terraform apply
```

### Destroy Infrastructure
```bash
terraform destroy
```

**Warning**: Deletes S3 bucket and CloudFront distribution!

## Deploying Application Code

After Terraform creates infrastructure, deploy your React app:

```bash
cd ..
./deploy.sh https://your-backend-api.com
```

This script:
1. Builds React app with backend URL
2. Uploads to S3
3. Invalidates CloudFront cache

## Multi-Client Deployment Example

### Client 1: Acme Corp
```bash
cd terraform-acme
# terraform.tfvars
bucket_name     = "acme-docucr"
domain_name     = "docucr.acme.com"
certificate_arn = "arn:aws:acm:us-east-1:...:certificate/acme-cert"

terraform apply
cd ..
./deploy.sh https://api.acme.com
```

### Client 2: TechStart Inc
```bash
cd terraform-techstart
# terraform.tfvars
bucket_name     = "techstart-docucr"
domain_name     = "app.techstart.io"
certificate_arn = "arn:aws:acm:us-east-1:...:certificate/techstart-cert"

terraform apply
cd ..
./deploy.sh https://api.techstart.io
```

### Result
- Separate S3 buckets and CloudFront distributions
- Independent domains and SSL certificates
- Isolated deployments per client
- Different backend API endpoints

## Cost Breakdown

Estimated monthly costs per client:
- **S3 Storage**: ~$0.50 (for 20GB)
- **S3 Requests**: ~$0.10 (for 100K requests)
- **CloudFront**: ~$1-5 (depends on traffic)
  - First 10TB: $0.085/GB
  - Data transfer out
- **Total**: ~$2-6/month per client

**Note**: CloudFront has a generous free tier (1TB/month for 12 months)

## Updating Existing Deployment

### Change Bucket Name
**Warning**: This creates a new bucket and deletes the old one!

1. Update `bucket_name` in `terraform.tfvars`
2. Run:
   ```bash
   terraform apply
   ```
3. Redeploy application:
   ```bash
   ../deploy.sh
   ```

### Add Custom Domain
1. Request SSL certificate in ACM (us-east-1)
2. Update `terraform.tfvars`:
   ```hcl
   domain_name     = "app.client.com"
   certificate_arn = "arn:aws:acm:..."
   ```
3. Apply:
   ```bash
   terraform apply
   ```
4. Add DNS CNAME record

### Change AWS Region
**Note**: CloudFront is global, but S3 bucket has a region

1. Update `aws_region` in `terraform.tfvars`
2. Apply:
   ```bash
   terraform apply
   ```

## Troubleshooting

### Error: Bucket Name Already Exists
**Cause**: S3 bucket names are globally unique

**Fix**: Change `bucket_name` to something unique:
```hcl
bucket_name = "client-name-docucr-prod-2025"
```

### Error: Certificate Not Found
**Cause**: ACM certificate doesn't exist or wrong region

**Fix**: 
1. Certificate must be in `us-east-1` for CloudFront
2. Verify ARN:
   ```bash
   aws acm list-certificates --region us-east-1
   ```

### CloudFront Shows Old Content
**Cause**: Cache not invalidated

**Fix**: Invalidate cache:
```bash
DIST_ID=$(terraform output -raw distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### 403 Forbidden Error
**Cause**: Bucket policy or OAC misconfigured

**Fix**: Reapply Terraform:
```bash
terraform apply
```

### Custom Domain Not Working
**Cause**: DNS not configured or SSL certificate issue

**Fix**:
1. Verify certificate is validated in ACM
2. Check DNS CNAME points to CloudFront domain
3. Wait for DNS propagation (up to 48 hours)

### Access Denied After Terraform Apply
**Cause**: Bucket policy not applied correctly

**Fix**: Reapply Terraform or manually fix:
```bash
# Reapply Terraform (recommended)
terraform apply

# Or manually apply bucket policy
DIST_ID=$(terraform output -raw distribution_id)
BUCKET=$(terraform output -raw bucket_name)
CF_ARN=$(aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.ARN' --output text)

cat > /tmp/policy.json << EOF
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": {"StringEquals": {"AWS:SourceArn": "${CF_ARN}"}}
  }]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET --policy file:///tmp/policy.json
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## Security Best Practices

1. **Never commit terraform.tfvars** - Contains sensitive data
2. **Use separate AWS accounts** for different clients
3. **Enable MFA** on AWS accounts
4. **Use custom domains with SSL** - Don't use CloudFront URLs in production
5. **Enable CloudFront logging** for audit trails
6. **Review bucket policies** regularly
7. **Enable S3 versioning** (already configured)
8. **Verify bucket policy after deployment** - Ensure CloudFront OAC access is configured

## Performance Optimization

### Cache Configuration
Already optimized:
- **Static assets** (`/assets/*`): 1 year cache
- **index.html**: No cache (always fresh)
- **Compression**: Enabled for all content

### Custom Cache Policy
To modify caching, edit `main.tf`:
```hcl
ordered_cache_behavior {
  path_pattern = "/api/*"
  min_ttl      = 0
  default_ttl  = 0
  max_ttl      = 0
}
```

### Price Class
Current: `PriceClass_100` (US, Canada, Europe)

For global: Change to `PriceClass_All` in `main.tf`:
```hcl
price_class = "PriceClass_All"
```

## Monitoring

### CloudFront Metrics
```bash
# View distribution details
aws cloudfront get-distribution --id $(terraform output -raw distribution_id)

# Check invalidation status
aws cloudfront list-invalidations --distribution-id $(terraform output -raw distribution_id)
```

### S3 Metrics
```bash
# List bucket contents
aws s3 ls s3://$(terraform output -raw bucket_name)/

# Check bucket size
aws s3 ls s3://$(terraform output -raw bucket_name) --recursive --summarize
```

## Backup and Recovery

### S3 Versioning
Already enabled - previous versions retained automatically.

**Restore previous version**:
```bash
aws s3api list-object-versions --bucket your-bucket-name --prefix index.html
aws s3api copy-object --copy-source your-bucket-name/index.html?versionId=VERSION_ID ...
```

### Terraform State Backup
```bash
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d)
```

## Next Steps

After Terraform deployment:
1. **Deploy application**: Run `../deploy.sh https://your-backend-api.com`
2. **Configure DNS**: Point domain to CloudFront (if using custom domain)
3. **Test deployment**: Visit CloudFront URL or custom domain
4. **Monitor**: Check CloudFront metrics in AWS Console
5. **Set up CI/CD**: Automate deployments with GitHub Actions or similar
