# Virtual Scrolling for Transcript Panel

## Feature Description
Implement virtual scrolling using React Window in the TranscriptPanel component to improve performance when displaying large numbers of transcript entries. This will prevent performance degradation and UI freezing when meetings generate extensive transcripts.

## Expected Behavior
Users should be able to:
- View large transcripts without performance issues
- Maintain smooth scrolling even with thousands of transcript entries
- Keep auto-scrolling behavior during live recording
- Experience consistent UI responsiveness during long meetings

## Current Behavior
- All transcript entries are rendered in a single container div
- Performance degrades with large numbers of transcript entries
- Potential UI freezing or lag during extended meetings
- Memory usage increases linearly with transcript length

## Technical Details
- Location: `src/components/TranscriptPanel.tsx`
- Current implementation: Simple `.map()` over transcripts array in one div
- Required changes: Replace with react-window List component
- Data structure: Array of TranscriptEntry objects with timestamp, text, and optional translation
- Must maintain: Auto-scroll behavior when `isRecording` is true

## Relevant Components
- **`TranscriptPanel`** (`src/components/TranscriptPanel.tsx`)
  - Current implementation renders all transcripts in single container
  - Contains `transcript-container` div with auto-scroll logic
  - Maps over `transcripts` array to render individual entries
  - Handles empty state and recording indicators
- **Package Dependencies**
  - Need to add `react-window` as dependency
  - May need `react-window-infinite-loader` for additional optimization

## Technical Requirements
- Install react-window as a dependency
- Implement ItemRenderer function for transcript entries
- Calculate item height (may need dynamic height calculation for variable text lengths)
- Handle auto-scrolling to bottom during recording
- Preserve existing styling and layout
- Consider chunking strategy for transcript entries (individual entries vs grouped chunks)

## Priority
Medium - Performance enhancement for long meetings

## Status
Open

## Acceptance Criteria
- [ ] react-window installed as dependency
- [ ] TranscriptPanel uses FixedSizeList or VariableSizeList component
- [ ] All transcript entries render correctly with timestamps and text
- [ ] Auto-scrolling works during live recording
- [ ] Performance tested with 1000+ transcript entries
- [ ] No visual regressions in styling/layout
- [ ] Memory usage optimized for large transcripts
- [ ] Existing functionality (clear button, empty states) preserved