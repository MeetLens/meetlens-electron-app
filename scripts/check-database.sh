#!/bin/bash

# Database integrity checker for MeetLens Electron App
# This script helps diagnose database issues with transcript persistence

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MeetLens Database Integrity Checker ===${NC}\n"

# Detect database location based on platform
if [[ "$OSTYPE" == "darwin"* ]]; then
  DB_PATH="$HOME/Library/Application Support/meetlens-electron-app/meetlens.db"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  DB_PATH="$HOME/.config/meetlens-electron-app/meetlens.db"
else
  DB_PATH="$APPDATA/meetlens-electron-app/meetlens.db"
fi

echo -e "${BLUE}Database path:${NC} $DB_PATH\n"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo -e "${RED}✗ Database file does not exist!${NC}"
  echo -e "\nThis is expected if you haven't run the app yet."
  echo -e "Start the app and create a meeting to initialize the database."
  exit 1
fi

echo -e "${GREEN}✓ Database file exists${NC}"

# Check file size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
echo -e "${BLUE}Database size:${NC} $DB_SIZE\n"

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
  echo -e "${RED}✗ sqlite3 is not installed${NC}"
  echo -e "\nInstall it with:"
  echo -e "  macOS: brew install sqlite"
  echo -e "  Linux: apt-get install sqlite3"
  exit 1
fi

echo -e "${GREEN}✓ sqlite3 is available${NC}\n"

# Run integrity check
echo -e "${BLUE}Running PRAGMA integrity_check...${NC}"
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
if [ "$INTEGRITY" == "ok" ]; then
  echo -e "${GREEN}✓ Database integrity: OK${NC}\n"
else
  echo -e "${RED}✗ Database integrity check failed:${NC}"
  echo "$INTEGRITY"
  exit 1
fi

# Check schema
echo -e "${BLUE}Checking schema...${NC}"

# Check if meetings table exists
MEETINGS_TABLE=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='meetings';" || echo "")
if [ -z "$MEETINGS_TABLE" ]; then
  echo -e "${RED}✗ meetings table is missing${NC}"
else
  echo -e "${GREEN}✓ meetings table exists${NC}"
fi

# Check if transcripts table exists
TRANSCRIPTS_TABLE=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='transcripts';" || echo "")
if [ -z "$TRANSCRIPTS_TABLE" ]; then
  echo -e "${RED}✗ transcripts table is missing${NC}"
else
  echo -e "${GREEN}✓ transcripts table exists${NC}"
fi

# Check if unique index exists
INDEX_EXISTS=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_transcripts_meeting_timestamp';" || echo "")
if [ -z "$INDEX_EXISTS" ]; then
  echo -e "${RED}✗ CRITICAL: idx_transcripts_meeting_timestamp index is missing${NC}"
  echo -e "${YELLOW}  This will cause transcript persistence to fail!${NC}"
  echo -e "${YELLOW}  Delete the database and restart the app to recreate it.${NC}\n"
else
  echo -e "${GREEN}✓ idx_transcripts_meeting_timestamp index exists${NC}"
fi

echo ""

# Check data counts
echo -e "${BLUE}Data statistics:${NC}"
MEETING_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM meetings;" || echo "0")
TRANSCRIPT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM transcripts;" || echo "0")

echo -e "  Meetings: ${GREEN}$MEETING_COUNT${NC}"
echo -e "  Transcripts: ${GREEN}$TRANSCRIPT_COUNT${NC}"

echo ""

# Show recent meetings
if [ "$MEETING_COUNT" -gt 0 ]; then
  echo -e "${BLUE}Recent meetings:${NC}"
  sqlite3 "$DB_PATH" "SELECT id, name, created_at FROM meetings ORDER BY created_at DESC LIMIT 5;" -header -column
  echo ""
fi

# Show recent transcripts
if [ "$TRANSCRIPT_COUNT" -gt 0 ]; then
  echo -e "${BLUE}Recent transcripts:${NC}"
  sqlite3 "$DB_PATH" "SELECT id, meeting_id, timestamp, SUBSTR(text, 1, 50) || '...' as text_preview FROM transcripts ORDER BY id DESC LIMIT 5;" -header -column
  echo ""
fi

# Check for orphaned transcripts
ORPHANED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM transcripts WHERE meeting_id NOT IN (SELECT id FROM meetings);" || echo "0")
if [ "$ORPHANED" -gt 0 ]; then
  echo -e "${YELLOW}⚠ Warning: $ORPHANED orphaned transcripts found${NC}"
  echo -e "  These transcripts reference non-existent meetings."
else
  echo -e "${GREEN}✓ No orphaned transcripts${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if [ -z "$INDEX_EXISTS" ]; then
  echo -e "${RED}✗ Database schema is INCORRECT${NC}"
  echo -e "\n${YELLOW}RECOMMENDED ACTION:${NC}"
  echo -e "  1. Close the Electron app"
  echo -e "  2. Delete the database: rm \"$DB_PATH\""
  echo -e "  3. Restart the app (database will be recreated with correct schema)"
else
  echo -e "${GREEN}✓ Database schema is correct${NC}"
  if [ "$TRANSCRIPT_COUNT" -eq 0 ] && [ "$MEETING_COUNT" -gt 0 ]; then
    echo -e "\n${YELLOW}Note: You have meetings but no transcripts.${NC}"
    echo -e "This might be normal if you haven't recorded anything yet,"
    echo -e "or it could indicate a persistence issue."
    echo -e "\nCheck the troubleshooting guide at:"
    echo -e "  docs/troubleshooting/transcript-persistence-not-working.md"
  fi
fi

echo ""
