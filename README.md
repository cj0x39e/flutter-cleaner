# flutter-cleaner

A CLI tool to clean Flutter project cache and build artifacts.

## Features

- **Multi-platform support**: Clean Flutter, Android, and iOS caches
- **Flexible cleaning modes**:
  - Fast: Clean only build directories
  - Standard: Clean build directories and caches
  - Deep: Clean project caches + global caches (Gradle, CocoaPods, Pub)
- **Safe by default**: Preview mode and interactive confirmation before deletion
- **Smart dependency detection**: Deep clean only removes unused global packages

## Installation

```bash
# Clone the repository
git clone https://github.com/cj0x39e/flutter-cleaner.git
cd flutter-cleaner

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

```bash
# Basic usage (clean current directory)
npm start

# Specify project path
npm start -- -p /path/to/flutter/project

# Fast clean (build directories only)
npm start -- --fast

# Deep clean (includes global caches)
npm start -- --deep

# Preview what would be cleaned
npm start -- --dry-run

# Combine options
npm start -- -p /path/to/project --deep --dry-run
```

## Command Options

| Option | Description |
|--------|-------------|
| `-p, --project <path>` | Flutter project path (default: current directory) |
| `-f, --fast` | Fast clean mode (build directories only) |
| `-s, --standard` | Standard clean mode (includes caches) |
| `-D, --deep` | Deep clean mode (includes global caches) |
| `-c, --config <path>` | Config file path for deep clean |
| `-d, --dry-run` | Preview mode (show what would be cleaned) |
| `--no-color` | Disable colored output |

## What Gets Cleaned

### Flutter
- `build/` - Build output directory
- `.dart_tool/` - Dart tool cache
- `.flutter-plugins` - Plugin registry
- `.flutter-plugins-dependencies` - Plugin dependencies
- `.packages` - Package links

### Android
- `build/` - Gradle build output
- `.gradle/` - Gradle cache (when using deep clean)
- `app/build/` - App module build output

### iOS
- `build/` - Xcode build output
- `Pods/` - CocoaPods pods (when using deep clean)
- `ios/.symlinks/` - Flutter iOS dependencies

## Deep Clean Configuration

For deep clean to work intelligently (only removing unused packages), create a config file:

```json
{
  "projects": [
    {
      "path": "/path/to/project1",
      "enabled": true
    },
    {
      "path": "/path/to/project2",
      "enabled": true
    }
  ]
}
```

Then run:
```bash
npm start -- --deep -c config.json
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT
