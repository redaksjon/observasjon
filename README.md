# Observasjon: Audio Transcription with Intelligence

<!-- Test publish 2026-01-22 -->

## Overview

Observasjon is a powerful command-line utility that transforms audio recordings into intelligent, context-enhanced notes. It uses AI to transcribe, classify, and enhance audio content, making it more useful and actionable.

## How It Works

Observasjon processes each audio file through three distinct phases:

1. **Locate**: Scans your input directory to find audio files
2. **Transcribe**: Uses OpenAI's Whisper to convert speech to text
3. **Classify**: Analyzes content to determine the type (meeting, email, idea, etc.)
4. **Compose**: Enhances the transcription with structure and context

## Installation

### Global Installation

```bash
npm install -g @redaksjon/observasjon
```

### From Source

```bash
git clone https://github.com/tobrien/redaksjon-observasjon.git
cd observasjon
npm install
npm run build
npm link
```

## Quick Start

```bash
# Set your OpenAI API key
export OPENAI_API_KEY='your-key-here'

# Process audio files
observasjon --input-directory ./recordings --output-directory ./notes

# Or use npx without installing
npx @redaksjon/observasjon --input-directory ./recordings --output-directory ./notes
```

## Output

Observasjon generates two output files for each processed audio file:

1. **Transcription JSON**: Contains raw transcription data
2. **Enhanced Note (Markdown)**: A structured, enhanced version based on the classified type

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--input-directory <dir>` | Directory containing audio files | Required |
| `--output-directory <dir>` | Where to save output files | Required |
| `--recursive` | Process subdirectories | `false` |
| `--model <model>` | OpenAI model for classification/composition | `gpt-4o-mini` |
| `--transcription-model <model>` | Whisper model | `whisper-1` |
| `--classify-model <model>` | Model for classification | Uses `--model` |
| `--compose-model <model>` | Model for composition | Uses `--model` |
| `--config-dir <dir>` | Configuration directory | `~/.observasjon` |
| `--context-directories <dirs>` | Directories with context files | None |
| `--verbose` | Enable verbose logging | `false` |
| `--debug` | Enable debug mode | `false` |
| `--dry-run` | Show what would be done | `false` |

## Examples

```bash
# Process current directory
observasjon --input-directory . --output-directory ./notes

# Process recursively with verbose output
observasjon --input-directory ./recordings --output-directory ./notes --recursive --verbose

# Use different models for different phases
observasjon --classify-model gpt-4 --compose-model gpt-3.5-turbo --input-directory ./recordings

# Use a premium model for everything
observasjon --model gpt-4-turbo --input-directory ./recordings

# Organize output by month
observasjon --input-directory ./recordings --output-structure month

# Customize filename format
observasjon --input-directory ./recordings --filename-options "time subject"

# Use custom configuration
observasjon --input-directory ./recordings --config-dir ~/my-observasjon-config

# Add context from other directories
observasjon --input-directory ./recordings --context-directories ./my-notes ./project-docs
```

## Customization

Observasjon can be customized using a configuration directory.

### Configuration Directory

By default, observasjon looks for configuration files in `./.observasjon`. You can specify a different location:

```bash
observasjon --config-dir ~/my-observasjon-config
```

### Custom Instructions

You can customize how observasjon processes different types of content by providing custom instruction files.

## Context Enhancement

Observasjon can enhance your notes with relevant context from existing files using the `--context-directories` option. This feature allows the AI to access and reference information from your knowledge base when processing audio recordings.

```bash
observasjon --input-directory ./recordings --context-directories ./my-notes

# Multiple context directories
observasjon --input-directory ./recordings --context-directories ./my-notes ./project-docs ./reference-materials

# With additional options
observasjon --input-directory ./recordings --output-directory ./enhanced-notes --context-directories ./my-notes --model gpt-4
```

## License

Apache-2.0

## Author

Tim O'Brien <tobrien@discursive.com>
