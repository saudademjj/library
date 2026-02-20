#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
EMAIL="test_gap@example.com"
PASSWORD="password123"
SEAT_ID=1

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Gap Filling Verification..."

# 1. Register/Login User
echo "1. Authenticating..."
REGISTER_RES=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Test User\",\"studentId\":\"12345678\",\"phone\":\"13800138000\"}")

LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Login failed.${NC}"
  echo $LOGIN_RES
  exit 1
fi
echo -e "${GREEN}Authenticated.${NC}"

# 1.5 Get a valid Seat ID
echo "1.5 Fetching seats..."
SEATS_RES=$(curl -s -X GET "$API_URL/seats" \
  -H "Authorization: Bearer $TOKEN")

# Simple extraction using pattern matching or jq if available.
# Assuming standard JSON response: {"ok":true,"data":[{"id":123,...}]}
# We'll try to use python or node to extract for reliability, or grep.
# Mac usually has python3.

SEAT_ID=$(echo $SEATS_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")

if [ -z "$SEAT_ID" ] || [ "$SEAT_ID" == "null" ]; then
  echo -e "${RED}Failed to find any seats.${NC}"
  echo $SEATS_RES
  exit 1
fi
echo -e "${GREEN}Using Seat ID: $SEAT_ID${NC}"

# Clear existing reservations for seat (Admin optional, or just assume clean state/different seat)
# For simplicity, we just hope seat 1 is available or we use a random seat? 
# Let's assume seat 1 exists.

# 2. Check initial availability
echo "2. Checking Seat Availability (Expect Free)..."
AVAIL_RES=$(curl -s -X GET "$API_URL/seats/$SEAT_ID/availability" \
  -H "Authorization: Bearer $TOKEN")
echo $AVAIL_RES

# 3. Create a FUTURE Advance Reservation (e.g., 3 hours from now)
echo "3. Creating Advance Reservation (3 hours later)..."
NOW_TS=$(date +%s)
START_TS=$((NOW_TS + 3*3600))
END_TS=$((NOW_TS + 5*3600))
START_ISO=$(date -u -r $START_TS +"%Y-%m-%dT%H:%M:%S.000Z")
END_ISO=$(date -u -r $END_TS +"%Y-%m-%dT%H:%M:%S.000Z")

ADVANCE_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seatId\":$SEAT_ID, \"reservationType\":\"advance\", \"startTime\":\"$START_ISO\", \"endTime\":\"$END_ISO\"}")
echo $ADVANCE_RES

# 4. Check Availability again (Expect Limited)
echo "4. Checking Seat Availability (Expect Limited)..."
AVAIL_RES_2=$(curl -s -X GET "$API_URL/seats/$SEAT_ID/availability" \
  -H "Authorization: Bearer $TOKEN")
echo $AVAIL_RES_2

# 5. Create Walk-in Reservation (Should fit in the gap)
echo "5. Creating Walk-in Reservation (Expect Success with limited time)..."
WALKIN_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seatId\":$SEAT_ID, \"reservationType\":\"walk_in\"}")
echo $WALKIN_RES

# 6. Verify Walk-in Reservation End Time
# Manually check if valid

echo "Verification Complete."
