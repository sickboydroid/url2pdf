# Webpage to PDF Converter

A Node.js script that converts web pages to PDF files with directory structure support and parallel processing.

## Features

- Dual operation modes:
  - **File Mode**: Process nested JSON structures with URLs
  - **Direct Mode**: Convert single URLs to PDF
- Automatic directory creation
- Existing file skipping
- Parallel processing (4 concurrent conversions)
- Error logging to `error.txt`
- Help system with examples

## Prerequisites

- Node.js v16+
- npm (comes with Node.js)
- Puppeteer (will be installed automatically)

## Installation

1. Clone repository:

```bash
git clone https://github.com/yourusername/pdf-converter.git
cd pdf-converter
```

2. Install dependencies:

```bash
npm install
```

## Usage

**File Mode (Process JSON structure)**

```bash
node script.js --mode f input.json
```

Example `input.json`:

```json
{
  "Programming": {
    "C++": {
      "Basics": "https://example.com/cpp-basics",
      "OOP": "https://example.com/cpp-oop"
    }
  },
  "Articles": "https://example.com/articles"
}
```

This creates:

```text
./Programming/C++/Basics.pdf
./Programming/C++/OOP.pdf
./Articles.pdf
```

**Direct Mode (Single URL conversion)**

```bash
node script.js --mode d "https://example.com/article" "output/docs/article.pdf"
```

**Help Command**

```bash
node script.js --help
```

## Configuration

While primarily a general-purpose tool, the JSON file supports a configuration placeholder:

```json
{
  "config": {},
  "Content": {
    "Tutorials": "https://example.com/tutorials"
  }
}
```

## Error Handling

Failed conversions are logged to `error.txt` in the same format as input JSON for easy retries.

## Notes

- PDF margins are set to 10mm on all sides
- Automatically scrolls pages to load lazy content
- Skips existing files to avoid reprocessing
- Timeout set to 2 minutes per conversion
- Adjust concurrency in code if needed (default: 4)
