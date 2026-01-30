#!/bin/bash

# Sync OpenAPI spec from local API server to Mintlify docs

API_URL="${AGENTVIEW_API_URL:-http://localhost:1990}"
OUTPUT_FILE="apps/docs/openapi.json"

echo "Fetching OpenAPI spec from $API_URL/openapi..."

curl -s "$API_URL/openapi" > "$OUTPUT_FILE"

if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
  echo "OpenAPI spec saved to $OUTPUT_FILE"
else
  echo "Failed to fetch OpenAPI spec"
  exit 1
fi
