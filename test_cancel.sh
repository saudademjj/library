#!/bin/bash

API_URL="http://localhost:3000/api"
EMAIL="test_gap@example.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Cancellation Reproduction..."

# 1. Login
echo "1. Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Login failed.${NC}"
  exit 1
fi
echo -e "${GREEN}Authenticated.${NC}"

# 1.5 Fetch User's Reservations and Try to Cancel Pending ones
echo "1.5 Fetching User Reservations..."
USER_RES=$(curl -s -X GET "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN")

# Python script to find a pending reservation ID or create one if none
REPRO_ID=$(echo $USER_RES | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)['data']
    pending = [r for r in data if r['status'] == 'pending']
    if pending:
        print(pending[0]['id'])
    else:
        print('')
except:
    print('')
")

if [ -z "$REPRO_ID" ]; then
    echo "No pending reservations found. Creating one..."
    # Reuse getting seat logic
    SEATS_RES=$(curl -s -X GET "$API_URL/seats" \
      -H "Authorization: Bearer $TOKEN")
    SEAT_ID=$(echo $SEATS_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")
    
    RES_RES=$(curl -s -X POST "$API_URL/reservations" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"seatId\":$SEAT_ID, \"reservationType\":\"walk_in\"}")
    REPRO_ID=$(echo $RES_RES | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['id'] if d.get('ok') else '')")
    
    if [ -z "$REPRO_ID" ]; then
        echo -e "${RED}Failed to create reservation for repro. Maybe seat occupied?${NC}"
        echo $RES_RES
        exit 1
    fi
fi

echo -e "${GREEN}Target Reservation ID: $REPRO_ID${NC}"

# 3. Try to Cancel
echo "3. Attempting to Cancel Reservation $REPRO_ID..."
CANCEL_RES=$(curl -s -X PATCH "$API_URL/reservations/$REPRO_ID/cancel" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $CANCEL_RES

if [[ $CANCEL_RES == *"ok\":true"* ]]; then
  echo -e "${GREEN}Cancellation Successful (Unexpected before fix)${NC}"
else
  echo -e "${RED}Cancellation Failed (BP Reproducing Bug)${NC}"
fi

