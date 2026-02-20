#!/bin/bash

API_URL="http://localhost:3000/api"
EMAIL="test_gap@example.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Flexibility Test..."

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
echo "Fetching a seat..."
SEATS_RES=$(curl -s -X GET "$API_URL/seats" -H "Authorization: Bearer $TOKEN")
SEAT_ID=$(echo $SEATS_RES | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")

echo "Using Seat ID: $SEAT_ID"

# 2. Walk-in with custom time (Now + 2 hours)
echo "2. Testing Walk-in with custom end time..."
NOW=$(python3 -c "import datetime; print(datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z'))")
END=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

# We don't send startTime for walk_in usually, but now we can?
# Actually endpoint says: if reservationType=walk_in, if startTime provided, it is used?
# Let's check code: "if (reservationType === 'advance') { ... } else { ... if (startTime) reservationStart = new Date(startTime) ... }"
# Yes, checking my previous edit (Wait, I re-introduced walk_in logic but did I keep the startTime usage?)
# Let's assume standard walk-in uses NOW, but let's try to set explicit startTime slightly in future?
# No, walk_in usually implies NOW.
# But for "Flexible Booking", I allowed startTime to be set in frontend.
# Let's try sending explicit startTime and endTime for walk_in.

START_TIME=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(minutes=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

RES_PAYLOAD="{\"seatId\":$SEAT_ID, \"reservationType\":\"walk_in\", \"startTime\":\"$START_TIME\", \"endTime\":\"$END\"}"
echo "Payload: $RES_PAYLOAD"

RES_RES=$(curl -s -X POST "$API_URL/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RES_PAYLOAD")

RESERVATION_ID=$(echo $RES_RES | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['id'] if d.get('ok') else '')")

if [ -z "$RESERVATION_ID" ]; then
    echo -e "${RED}Failed to create flexible reservation.${NC}"
    echo $RES_RES
    # cleanup previous if exists?
else
    echo -e "${GREEN}Created Reservation $RESERVATION_ID with custom times.${NC}"
fi

# 3. Adjust Reservation (Shorten it)
echo "3. Testing Adjust (shorten)..."
NEW_END=$(python3 -c "import datetime; print((datetime.datetime.utcnow() + datetime.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

ADJUST_RES=$(curl -s -X PATCH "$API_URL/reservations/$RESERVATION_ID/adjust" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"startTime\":\"$START_TIME\", \"endTime\":\"$NEW_END\"}")

if [[ $ADJUST_RES == *"ok\":true"* ]]; then
    echo -e "${GREEN}Adjustment Successful.${NC}"
else
    echo -e "${RED}Adjustment Failed.${NC}"
    echo $ADJUST_RES
fi

# 4. Cleanup
echo "4. Cleaning up (Cancel)..."
curl -s -X PATCH "$API_URL/reservations/$RESERVATION_ID/cancel" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "Done."
