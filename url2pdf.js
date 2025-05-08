const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);

// Handle help command
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Universal PDF Converter
Usage:
  File mode:    node script.js --mode f input.json
  Direct mode:  node script.js --mode d url output.pdf

Options:
  --mode, -m    Operation mode (f for file, d for direct)
  --help, -h    Show this help message

JSON File Format:
{
  "config": {}, // Configuration placeholder
  "Category1": {
    "Subcategory": {
      "File Name": "https://example.com/page"
    }
  },
  "Single File": "https://example.com/another-page"
}

Examples:
  1. Process JSON file:
     node script.js --mode f courses.json

  2. Convert single URL:
     node script.js --mode d "https://example.com" "output.pdf"
`);
  process.exit(0);
}

// Parse command line arguments
const modeIndex = args.indexOf("--mode");
const mode = modeIndex !== -1 ? args[modeIndex + 1] : null;
const input = modeIndex !== -1 ? args[modeIndex + 2] : null;
const output = modeIndex !== -1 && mode === "d" ? args[modeIndex + 3] : null;

if (!mode || !["f", "d"].includes(mode)) {
  console.error("Invalid arguments. Use --help for usage information.");
  process.exit(1);
}

let tasks = [];
const errors = [];

async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function processTask(browser, task) {
  const page = await browser.newPage();
  try {
    console.log(`🌐 Processing: ${task.url}`);

    await page.goto(task.url, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    await scrollPage(page);

    await page.pdf({
      path: task.filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
      timeout: 120000,
    });

    console.log(`✅ Success: ${task.filePath}`);
  } catch (err) {
    console.error(`❌ Failed: ${task.url} - ${err.message}`);
    errors.push({ ...task, error: err.message });
  } finally {
    await page.close();
  }
}

async function runParallelConversions(concurrency = 4) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });

  let currentIndex = 0;
  const worker = async () => {
    while (currentIndex < tasks.length) {
      const task = tasks[currentIndex++];
      await processTask(browser, task);
    }
  };

  try {
    await Promise.all(Array(concurrency).fill().map(worker));
  } finally {
    await browser.close();
  }
}

function processStructure(obj, basePath = "") {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path.join(basePath, key);

    if (typeof value === "string") {
      const fileName = `${key}.pdf`;
      const filePath = path.join(basePath, fileName);

      if (!fs.existsSync(filePath)) {
        tasks.push({
          title: key,
          url: value,
          filePath,
          dir: basePath,
        });
      } else {
        console.log(`⏩ Skipping existing file: ${filePath}`);
      }
    } else if (typeof value === "object") {
      fs.mkdirSync(currentPath, { recursive: true });
      processStructure(value, currentPath);
    }
  }
}

async function prepareTasks() {
  if (mode === "f") {
    const jsonData = JSON.parse(fs.readFileSync(input, "utf8"));
    processStructure(jsonData);
  } else if (mode === "d") {
    const outputPath = path.resolve(output);
    const dir = path.dirname(outputPath);

    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(outputPath)) {
      tasks.push({
        title: path.basename(outputPath, ".pdf"),
        url: input,
        filePath: outputPath,
        dir: dir,
      });
    } else {
      console.log(`⏩ Skipping existing file: ${outputPath}`);
    }
  }
}

async function writeErrorLog() {
  if (errors.length === 0) return;

  const errorData = errors.map(({ dir, title, url }) => ({
    [dir]: { [title]: url },
  }));

  await writeFile("error.txt", JSON.stringify(errorData, null, 2));
  console.log("⚠️  Error log saved to error.txt");
}

async function main() {
  try {
    await prepareTasks();

    if (tasks.length === 0) {
      console.log("⏭  No files to process");
      return;
    }

    console.log(`🚀 Starting conversion of ${tasks.length} pages`);
    await runParallelConversions();
    await writeErrorLog();
    console.log("🎉 Conversion process completed");
  } catch (err) {
    console.error("🔥 Critical error:", err);
    process.exit(1);
  }
}

main();
