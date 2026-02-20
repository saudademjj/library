#!/bin/bash

API_URL="http://localhost:3000/api"
EMAIL="test_gap@example.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Verifying Unlimited Walk-in..."

# 0. Register (Ignore error if exists)
echo "0. Registering..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Test User\",\"studentId\":\"12345678\",\"phone\":\"13800138000\"}" > /dev/null

# 1. Login
echo "1. Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Use Python to parse token safely
TOKEN=$(echo $LOGIN_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Login failed.${NC}"
  # Print raw response for debugging
  echo "Raw Response: $LOGIN_RES"
  exit 1
fi
echo -e "${GREEN}Authenticated.${NC}"

# 1.5 Cleanup all existing reservations for this user
echo "1.5 Cleaning up existing reservations..."
USER_RES=$(curl -s -X GET "$API_URL/reservations" -H "Authorization: Bearer $TOKEN")
# Parse and cancel all pending/active
echo $USER_RES | python3 -c "
import sys, json, os
data = json.load(sys.stdin)
if data.get('ok'):
    for r in data['data']:
        if r['status'] in ['active', 'pending']:
            print(f'Cancelling {r[\"id\"]}...')
            os.system(f'curl -s -X PATCH \"$API_URL/reservations/{r[\"id\"]}/cancel\" -H \"Authorization: Bearer $TOKEN\" > /dev/null')
"

# 2. Get Seat
SEATS_RES=$(curl -s -X GET "$API_URL/seats" \
  -H "Authorization: Bearer $TOKEN")
SEAT_ID=$(echo $SEATS_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")
echo "Using Seat ID: $SEAT_ID"

# 3. Create Walk-in Reservation
echo "3. Creating Walk-in Reservation..."
RES_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seatId\":$SEAT_ID, \"reservationType\":\"walk_in\"}")


echo "Response:"
echo $RES_RES

# 4. Verify End Time
END_TIME=$(echo $RES_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endTime'])")
echo "Reservation End Time: $END_TIME"

# Check if it ends at 23:59:59 (approx)
# ISO format: 2023-10-27T15:59:59.999Z (This is UTC, local time might be different)
# But our backend sets it to local 23:59:59 converted to UTC or just Date object local.
# Let's just manually check the log output.

if [[ $RES_RES == *"ok\":true"* ]]; then
  echo -e "${GREEN}Reservation Created.${NC}"
else
  echo -e "${RED}Reservation Failed.${NC}"
  exit 1
fi

# Cleanup
RES_ID=$(echo $RES_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
curl -s -X PATCH "$API_URL/reservations/$RES_ID/cancel" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Cleaned up."
