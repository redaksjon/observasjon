# Metadata Header Implementation

## Summary

Added automatic metadata header generation to all composed notes to ensure consistent metadata is always present in transcript outputs.

## Problem

The metadata headers in transcript outputs were inconsistent - some transcripts had metadata while others didn't. This was because:

1. The metadata was not being programmatically generated
2. The AI model was responsible for including metadata, which was unreliable
3. There were no instructions in the prompts telling the AI to include metadata

## Solution

### 1. Updated Classification Schema (`src/constants.ts`)

Added optional fields to the `DEFAULT_CLASSIFIED_RESPONSE_SCHEMA`:
- `project`: Project identifier
- `confidence`: Classification confidence score (0-1)
- `classificationSignals`: Array of signals that influenced classification
- `reasoning`: Brief explanation of classification decision
- `tags`: Array of relevant tags

### 2. Updated ClassifiedTranscription Type (`src/processor.ts`)

Extended the `ClassifiedTranscription` interface to include all classification metadata fields.

### 3. Enhanced Compose Phase (`src/phases/compose.ts`)

- Added `creationTime` and `destinationPath` parameters to the compose function
- Implemented `generateMetadata()` helper function that creates a formatted metadata header
- Added `formatDate()` and `formatTime()` helper functions
- Modified compose to prepend metadata header to all generated notes

The metadata header includes:
- **Date**: Formatted creation date
- **Time**: Formatted creation time
- **Project**: Project identifier (if available)
- **Routing**: Destination path and confidence score
- **Classification Signals**: Factors that influenced classification
- **Reasoning**: Brief explanation of classification
- **Tags**: Relevant categorization tags

### 4. Updated Processor (`src/processor.ts`)

- Modified to pass `creationTime` and `destinationPath` to the compose phase
- Added handling for undefined `subject` field with fallback to 'unknown'
- Added `path` import for path manipulation

### 5. Enhanced Classification Instructions (`src/prompt/instructions/classify.md`)

Added comprehensive instructions for the AI to include metadata fields:
- **Identify Project**: How to determine project from transcript and context
- **Provide Classification Metadata**: Guidelines for confidence, signals, reasoning, and tags

### 6. Updated Tests

Updated test files to match new function signatures:
- `tests/phases/compose.test.ts`: Added `creationTime` and `destinationPath` parameters to all test cases
- `tests/processor.test.ts`: Updated expected compose calls and added `audioFileBasename` to mock data

## Example Output

```markdown
## Metadata

**Date**: January 14, 2026
**Time**: 09:30 AM

**Project**: walmart
**Project ID**: `walmart`

### Routing

**Destination**: /Users/tobrien/Library/CloudStorage/GoogleDrive-tobrien@discursive.com/My Drive/individual/jobs/walmart/notes/2026/1/14-0930-oh-i-ve-been-exciting.md
**Confidence**: 59.6%

**Classification Signals**:
- explicit phrase: "walmart" (90% weight)
- context type: "work" (20% weight)

**Reasoning**: explicit phrase: "walmart", context: work

**Tags**: `walmart`

[Rest of transcript content...]
```

## Benefits

1. **Consistency**: Every transcript now has a metadata header
2. **Traceability**: Clear routing and classification information
3. **Debugging**: Classification signals and reasoning help understand AI decisions
4. **Organization**: Tags and project information improve searchability
5. **Reliability**: No longer dependent on AI model including metadata

## Testing

All tests pass:
- ✓ Compose phase tests (4 tests)
- ✓ Processor tests (6 tests)
- No linter errors

## Files Modified

- `src/constants.ts` - Updated schema
- `src/processor.ts` - Updated type and compose call
- `src/phases/compose.ts` - Added metadata generation
- `src/prompt/instructions/classify.md` - Enhanced classification instructions
- `tests/phases/compose.test.ts` - Updated test cases
- `tests/processor.test.ts` - Updated test expectations
