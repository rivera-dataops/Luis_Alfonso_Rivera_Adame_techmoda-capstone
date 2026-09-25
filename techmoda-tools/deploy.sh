#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
STACK_NAME="${STACK_NAME:-techmoda-ai}"
REGION="${AWS_REGION:-us-east-1}"
# Refuse to create a new stack implicitly if the workshop was reset.
python3 techmoda-tools/configure_frontend.py --stack "$STACK_NAME" --region "$REGION"
sam validate --lint --template-file template.yaml --region "$REGION"
sam build --no-cached --template-file template.yaml
# Review SAM's change set before executing it; never delete/recreate the stack.
sam deploy --stack-name "$STACK_NAME" --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --resolve-s3 \
  --confirm-changeset --no-fail-on-empty-changeset
STACK_NAME="$STACK_NAME" AWS_REGION="$REGION" bash techmoda-tools/publish-frontend.sh
python3 techmoda-tools/check_services.py --stack "$STACK_NAME" --region "$REGION"
