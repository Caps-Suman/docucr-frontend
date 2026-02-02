terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "bucket_name" {
  default = "docu-cr.app"
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "SSL Certificate ARN (optional - will auto-lookup if not provided)"
  type        = string
  default     = ""
}

# Auto-lookup certificate if domain_name is provided but certificate_arn is not
data "aws_acm_certificate" "domain" {
  count    = var.domain_name != "" && var.certificate_arn == "" ? 1 : 0
  domain   = "*.medeye360.com"  # Wildcard certificate
  statuses = ["ISSUED"]
  most_recent = true
}

locals {
  certificate_arn = var.certificate_arn != "" ? var.certificate_arn : (
    var.domain_name != "" ? data.aws_acm_certificate.domain[0].arn : ""
  )
}

# S3 Bucket
resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 Bucket Policy for CloudFront OAC
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  
  policy = jsonencode({
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.website.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
        }
      }
    }]
  })
}

# Response Headers Policy
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "docu-cr-app-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = false
    }
    content_type_options {
      override = false
    }
    frame_options {
      frame_option = "DENY"
      override     = false
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = false
    }
  }

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "no-cache"
      override = false
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  aliases = var.domain_name != "" ? [var.domain_name] : []
  
  default_cache_behavior {
    target_origin_id         = "S3-${aws_s3_bucket.website.bucket}"
    viewer_protocol_policy   = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
    compress        = true
  }
  
  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"
    
    viewer_protocol_policy = "redirect-to-https"
    
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]
    
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingOptimizedForUncompressedObjects
    compress        = true
    
    min_ttl     = 31536000 # 1 year
    default_ttl = 31536000
    max_ttl     = 31536000
  }
  
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 0
  }
  
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 0
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = local.certificate_arn == ""
    acm_certificate_arn           = local.certificate_arn != "" ? local.certificate_arn : null
    ssl_support_method            = local.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version      = local.certificate_arn != "" ? "TLSv1.2_2021" : null
  }
  
  price_class = "PriceClass_100"
  
  tags = {
    Name        = "${var.bucket_name}-distribution"
    Environment = "production"
  }
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "distribution_id" {
  value = aws_cloudfront_distribution.website.id
}

output "bucket_name" {
  value = aws_s3_bucket.website.bucket
}

output "custom_domain_url" {
  value = var.domain_name != "" ? "https://${var.domain_name}" : null
}