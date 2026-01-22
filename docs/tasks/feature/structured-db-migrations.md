# Structured Database Migrations

## Problem Description
Database schema updates are currently handled via manual `try-catch` blocks and `ALTER TABLE` statements in `main.ts`. This approach is fragile, hard to version-track, and doesn't handle complex migrations like data transformation or column type changes gracefully.

## Proposed Changes
- Implement a version-based migration system using SQLite's `user_version` PRAGMA.
- Create a dedicated `migrations/` directory or a structured object containing migration scripts.
- On application startup, compare the current database version with the latest available migration and run all necessary updates sequentially within a transaction.

## Technical Details
- **Location:** `electron/main.ts` (specifically `createDatabase` function).
- **Tooling:** Uses `better-sqlite3`.
- **Reference Pattern:**
  ```sql
  PRAGMA user_version; -- Get current version
  PRAGMA user_version = 2; -- Set new version
  ```

## Implementation Notes
- Added `electron/migrations.ts` with ordered migrations and a transaction-wrapped runner.
- `createDatabase` now calls `runMigrations` to apply versions 1-3 sequentially.
- Existing `meetings` and `transcripts` data is preserved via additive/checked schema changes.

## Priority
🟡 Medium - Important for long-term stability as the data model evolves.

## Status
Done

## Acceptance Criteria
- [x] Manual `try-catch` migration blocks are removed from `main.ts`.
- [x] A migration runner is implemented that handles upgrading from version 0 to the latest version.
- [x] Migrations are wrapped in transactions to prevent database corruption on failure.
- [x] Adding a new column in the future only requires adding a new migration script to the sequence.
- [x] Existing data in `meetings` and `transcripts` tables is preserved during the transition to the new system.
