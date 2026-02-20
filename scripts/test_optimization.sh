#!/bin/bash

API_URL="http://localhost:3000/api"
EMAIL="test_gap@example.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Optimization Test..."

# 1. Login
echo "1. Logging in..."
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

# Helper to get seat
SEATS_RES=$(curl -s -X GET "$API_URL/seats" -H "Authorization: Bearer $TOKEN")
SEAT_ID=$(echo $SEATS_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][1]['id'])")

# 2. Test Check-in Restriction (Too Early)
echo "2. Creating Future Reservation (+2 hours)..."
START=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")
END=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(hours=3)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

RES_PAYLOAD="{\"seatId\":$SEAT_ID, \"reservationType\":\"advance\", \"startTime\":\"$START\", \"endTime\":\"$END\"}"

RES_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RES_PAYLOAD")
  
RESERVATION_ID=$(echo $RES_RES | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['id'] if d.get('ok') else '')")

if [ -z "$RESERVATION_ID" ]; then
    echo -e "${RED}Failed to create future reservation.${NC}"
    echo $RES_RES
    exit 1
fi
echo -e "${GREEN}Created Future Reservation $RESERVATION_ID.${NC}"

echo "Attempting Check-in (Should Fail)..."
CHECKIN_RES=$(curl -s -X POST "$API_URL/reservations/$RESERVATION_ID/checkin" \
  -H "Authorization: Bearer $TOKEN")

if [[ $CHECKIN_RES == *"ok\":false"* ]]; then
    echo -e "${GREEN}Check-in blocked as expected.${NC}"
else
    echo -e "${RED}Check-in SUCCEEDED (Unexpected).${NC}"
    echo $CHECKIN_RES
fi

# Cleanup future reservation
curl -s -X PATCH "$API_URL/reservations/$RESERVATION_ID/cancel" -H "Authorization: Bearer $TOKEN" > /dev/null


# 3. Test Early Finish (Cancel) Logic
echo "3. Testing Early Finish Logic (Move Active to Future)..."
# Create walk-in (now)
NOW=$(python3 -c "import datetime; print(datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z'))")
END_WALKIN=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

WALKIN_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seatId\":$SEAT_ID, \"reservationType\":\"walk_in\", \"startTime\":\"$NOW\", \"endTime\":\"$END_WALKIN\"}")

WALKIN_ID=$(echo $WALKIN_RES | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['id'] if d.get('ok') else '')")

if [ -z "$WALKIN_ID" ]; then
    echo -e "${RED}Failed to create walk-in.${NC}"
    exit 1
fi

# Check-in (to make it active)
curl -s -X POST "$API_URL/reservations/$WALKIN_ID/checkin" -H "Authorization: Bearer $TOKEN" > /dev/null

# Move to future
ADJUST_RES=$(curl -s -X PATCH "$API_URL/reservations/$WALKIN_ID/adjust" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"startTime\":\"$START\", \"endTime\":\"$END\"}")

if [[ $ADJUST_RES != *"ok\":true"* ]]; then
    echo -e "${RED}Failed to adjust active reservation to future.${NC}"
    echo $ADJUST_RES
    # Proceed anyway to test finish if possible? No.
else 
    echo -e "${GREEN}Adjusted Active Reservation $WALKIN_ID to Future.${NC}"
    
    # Try Finish
    echo "Attempting Finish (Should cancel)..."
    FINISH_RES=$(curl -s -X POST "$API_URL/reservations/$WALKIN_ID/finish" \
      -H "Authorization: Bearer $TOKEN")
      
    if [[ $FINISH_RES == *"ok\":true"* && $FINISH_RES == *"cancelled"* ]]; then
         echo -e "${GREEN}Finish handled as cancellation as expected.${NC}"
    else
         echo -e "${RED}Finish NOT handled as cancellation.${NC}"
         echo $FINISH_RES
    fi
fi

echo "Done."
