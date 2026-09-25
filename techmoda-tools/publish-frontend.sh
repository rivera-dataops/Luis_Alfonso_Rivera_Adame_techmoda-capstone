#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_NAME="${STACK_NAME:-techmoda-ai}"
REGION="${AWS_REGION:-us-east-1}"
cd "$ROOT"
python3 techmoda-tools/configure_frontend.py --stack "$STACK_NAME" --region "$REGION"
BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --no-cli-pager)"
if [[ -z "$BUCKET" || "$BUCKET" == "None" || "$BUCKET" == *"/"* ]]; then
  echo "No hay un bucket de frontend válido." >&2
  exit 1
fi
aws s3api head-bucket --bucket "$BUCKET" --region "$REGION"
cd frontend
npm ci --no-audit --no-fund
npm run typecheck
npm run build
# Never use --delete: product photos share this bucket with the compiled assets.
aws s3 sync dist/ "s3://$BUCKET/" --region "$REGION" --exclude "*.template"
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --region "$REGION" --content-type text/html --cache-control no-cache
aws s3 cp dist/env-config.js "s3://$BUCKET/env-config.js" --region "$REGION" --content-type application/javascript --cache-control no-store
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text --no-cli-pager
