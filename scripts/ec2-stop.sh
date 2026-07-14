#!/usr/bin/env bash
# Gracefully stop the Sevagan stack, then stop the EC2 instance (no compute
# billing while stopped; EBS storage still billed; Elastic IP is retained).
# Usage: ./scripts/ec2-stop.sh
set -euo pipefail

cd "$(dirname "$0")/.."
CONFIG="scripts/ec2-control.env"
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — copy scripts/ec2-control.env.example and fill it in." >&2
  exit 1
fi
set -a; source "$CONFIG"; set +a

command -v aws >/dev/null || { echo "AWS CLI not found — install it first: https://aws.amazon.com/cli/" >&2; exit 1; }

echo "==> Stopping the Docker stack on ${EC2_HOST} (docker compose stop, not down — data volumes untouched)"
ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY_PATH" "${EC2_USER}@${EC2_HOST}" \
  "cd /opt/sevagan && docker compose -f docker-compose.prod.yml stop"

echo "==> Stopping EC2 instance ${INSTANCE_ID}"
aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "==> Waiting for instance to reach 'stopped' state"
aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "==> Instance stopped. Run scripts/ec2-start.sh to bring it back up."
