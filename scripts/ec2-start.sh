#!/usr/bin/env bash
# Start the EC2 instance, wait for it to be reachable, then bring the Docker
# stack back up (containers were `stop`ped, not `down`ed, so their restart
# policy won't auto-start them — must be brought up explicitly).
# Usage: ./scripts/ec2-start.sh
set -euo pipefail

cd "$(dirname "$0")/.."
CONFIG="scripts/ec2-control.env"
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — copy scripts/ec2-control.env.example and fill it in." >&2
  exit 1
fi
set -a; source "$CONFIG"; set +a

command -v aws >/dev/null || { echo "AWS CLI not found — install it first: https://aws.amazon.com/cli/" >&2; exit 1; }

echo "==> Starting EC2 instance ${INSTANCE_ID}"
aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "==> Waiting for instance to reach 'running' state"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "==> Waiting for status checks to pass"
aws ec2 wait instance-status-ok --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "==> Waiting for SSH to come up"
until ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 -o BatchMode=yes \
  -i "$SSH_KEY_PATH" "${EC2_USER}@${EC2_HOST}" true 2>/dev/null; do
  sleep 3
done

echo "==> Bringing the Docker stack back up"
ssh -i "$SSH_KEY_PATH" "${EC2_USER}@${EC2_HOST}" \
  "cd /opt/sevagan && docker compose -f docker-compose.prod.yml up -d"

echo "==> Waiting for the API to report healthy"
until curl -sf "http://${EC2_HOST}/api/v1/health" >/dev/null 2>&1; do
  sleep 3
done

echo "==> Instance running and stack healthy: http://${EC2_HOST}/"
