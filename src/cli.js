#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { generate } = require('./generators/index');
const { parse } = require('./parsers/index');

const program = new Command();

program
  .name('slidej')
  .description('Generate PPTX from JSON with animations. Parse PPTX back to JSON.')
  .version('2.0.0');

// ============================================================
// GENERATE command: JSON → PPTX
// ============================================================
program
  .command('generate')
  .alias('gen')
  .description('Generate a PPTX file from a JSON definition')
  .argument('<input>', 'Path to JSON file')
  .option('-o, --output <path>', 'Output PPTX file path', 'output.pptx')
  .action(async (input, options) => {
    try {
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(chalk.red(`Error: File not found: ${inputPath}`));
        process.exit(1);
      }

      console.log(chalk.blue('Reading JSON...'), inputPath);
      const raw = fs.readFileSync(inputPath, 'utf-8');
      let model;
      try {
        model = JSON.parse(raw);
      } catch (e) {
        console.error(chalk.red('Error: Invalid JSON:'), e.message);
        process.exit(1);
      }

      // Resolve relative image paths based on JSON file location
      const jsonDir = path.dirname(inputPath);
      resolveMediaPaths(model, jsonDir);

      console.log(chalk.blue('Generating PPTX...'));
      const result = await generate(model, options.output);

      console.log(chalk.green('✓ Success!'));
      console.log(chalk.white(`  File: ${result.path}`));
      console.log(chalk.white(`  Size: ${(result.size / 1024).toFixed(1)} KB`));
      console.log(chalk.white(`  Slides: ${result.slides}`));
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

// ============================================================
// PARSE command: PPTX → JSON
// ============================================================
program
  .command('parse')
  .description('Parse a PPTX file into JSON')
  .argument('<input>', 'Path to PPTX file')
  .option('-o, --output <path>', 'Output JSON file path (prints to stdout if omitted)')
  .option('--no-images', 'Skip extracting image base64 data')
  .option('--pretty', 'Pretty-print JSON output', true)
  .action(async (input, options) => {
    try {
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(chalk.red(`Error: File not found: ${inputPath}`));
        process.exit(1);
      }

      console.error(chalk.blue('Parsing PPTX...'), inputPath);
      const model = await parse(inputPath);

      // Strip base64 images if requested
      if (options.images === false) {
        stripBase64(model);
      }

      const json = JSON.stringify(model, null, options.pretty ? 2 : undefined);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, json);
        console.error(chalk.green('✓ Saved to:'), outputPath);
        console.error(chalk.white(`  Slides: ${model.slides.length}`));
        const elCount = model.slides.reduce((sum, s) => sum + s.elements.length, 0);
        console.error(chalk.white(`  Elements: ${elCount}`));
      } else {
        // Print JSON to stdout for piping
        console.log(json);
      }
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

// ============================================================
// SCHEMA command: Print JSON schema reference
// ============================================================
program
  .command('schema')
  .description('Print the JSON schema reference')
  .action(() => {
    console.log(chalk.bold.blue('\n═══ SlideJ JSON Schema ═══\n'));
    console.log(fs.readFileSync(path.join(__dirname, 'SCHEMA.md'), 'utf-8'));
  });

// ============================================================
// EXAMPLE command: Generate an example JSON file
// ============================================================
program
  .command('example')
  .description('Generate an example JSON file')
  .option('-o, --output <path>', 'Output path', 'example.json')
  .action((options) => {
    const example = generateExample();
    const json = JSON.stringify(example, null, 2);
    fs.writeFileSync(path.resolve(options.output), json);
    console.log(chalk.green('✓ Example saved to:'), path.resolve(options.output));
    console.log(chalk.white('  Run: slidej generate example.json -o example.pptx'));
  });

// ============================================================
// HELPERS
// ============================================================

function resolveMediaPaths(model, baseDir) {
  for (const slide of model.slides || []) {
    for (const el of slide.elements || []) {
      if (el.type === 'image' && el.src && !el.src.startsWith('data:') && !path.isAbsolute(el.src)) {
        el.src = path.resolve(baseDir, el.src);
      }
      if (el.type === 'group' && el.children) {
        for (const child of el.children) {
          if (child.type === 'image' && child.src && !child.src.startsWith('data:') && !path.isAbsolute(child.src)) {
            child.src = path.resolve(baseDir, child.src);
          }
        }
      }
    }
  }
}

function stripBase64(model) {
  for (const slide of model.slides || []) {
    for (const el of slide.elements || []) {
      if (el.srcBase64) delete el.srcBase64;
      if (el.type === 'group' && el.children) {
        for (const child of el.children) {
          if (child.srcBase64) delete child.srcBase64;
        }
      }
    }
  }
}

function generateExample() {
  return {
    width: 13.333,
    height: 7.5,
    meta: { title: "SlideJ Demo", author: "AI Agent" },
    theme: {
      colors: {
        accent1: "4472C4",
        accent2: "ED7D31",
        dk1: "000000",
        lt1: "FFFFFF",
      },
      majorFont: "Calibri Light",
      minorFont: "Calibri",
    },
    slides: [
      {
        background: "1a1a2e",
        transition: { type: "fade", speed: "med" },
        elements: [
          {
            type: "text",
            text: "Welcome to SlideJ",
            position: { x: 1, y: 1.5, w: 11, h: 1.5 },
            fontSize: 48,
            bold: true,
            color: "FFFFFF",
            align: "center",
            fontFamily: "Calibri Light",
            animations: [
              { type: "fadeIn", duration: 800, trigger: "afterPrevious" }
            ]
          },
          {
            type: "text",
            text: "Generate PowerPoint from JSON — with animations",
            position: { x: 2, y: 3.5, w: 9, h: 1 },
            fontSize: 24,
            color: "888888",
            align: "center",
            animations: [
              { type: "fadeIn", duration: 600, trigger: "afterPrevious", delay: 300 }
            ]
          },
          {
            type: "shape",
            shapeType: "roundRect",
            position: { x: 4.5, y: 5, w: 4, h: 0.8 },
            fill: "4472C4",
            line: { color: "3461B3", width: 1 },
            text: "Get Started →",
            fontSize: 18,
            color: "FFFFFF",
            align: "center",
            vertAlign: "middle",
            animations: [
              { type: "flyIn", direction: "bottom", duration: 500, trigger: "afterPrevious", delay: 200 }
            ]
          }
        ]
      },
      {
        background: "FFFFFF",
        transition: "push",
        elements: [
          {
            type: "text",
            text: "Features",
            position: { x: 0.5, y: 0.3, w: 12, h: 1 },
            fontSize: 36,
            bold: true,
            color: "1a1a2e",
            align: "center",
            animations: [
              { type: "fadeIn", duration: 500, trigger: "afterPrevious" }
            ]
          },
          {
            type: "shape",
            shapeType: "roundRect",
            position: { x: 0.5, y: 1.8, w: 3.8, h: 2.5 },
            fill: { type: "gradient", stops: [
              { position: 0, color: "4472C4" },
              { position: 100, color: "2E5CA8" }
            ], angle: 135 },
            text: [
              { text: "Text & Shapes", fontSize: 20, bold: true, color: "FFFFFF" },
              { text: "Rich text, auto shapes, gradients, shadows", fontSize: 14, color: "CCDDFF" }
            ],
            vertAlign: "middle",
            align: "center",
            shadow: { blur: 6, distance: 3, angle: 45, color: "000000", opacity: 30 },
            animations: [
              { type: "flyIn", direction: "left", duration: 600, trigger: "onClick" }
            ]
          },
          {
            type: "shape",
            shapeType: "roundRect",
            position: { x: 4.7, y: 1.8, w: 3.8, h: 2.5 },
            fill: "ED7D31",
            text: [
              { text: "Tables", fontSize: 20, bold: true, color: "FFFFFF" },
              { text: "Header rows, cell styling, auto-sizing", fontSize: 14, color: "FFE0C0" }
            ],
            vertAlign: "middle",
            align: "center",
            animations: [
              { type: "flyIn", direction: "bottom", duration: 600, trigger: "afterPrevious", delay: 200 }
            ]
          },
          {
            type: "shape",
            shapeType: "roundRect",
            position: { x: 8.9, y: 1.8, w: 3.8, h: 2.5 },
            fill: "70AD47",
            text: [
              { text: "Animations", fontSize: 20, bold: true, color: "FFFFFF" },
              { text: "Fade, fly, zoom, wipe, spin & more", fontSize: 14, color: "D4F0C0" }
            ],
            vertAlign: "middle",
            align: "center",
            animations: [
              { type: "flyIn", direction: "right", duration: 600, trigger: "afterPrevious", delay: 200 }
            ]
          },
          {
            type: "table",
            position: { x: 1, y: 5, w: 11, h: 2 },
            headerRow: true,
            fontSize: 12,
            rows: [
              ["Component", "Support", "Animation"],
              ["Text", "✓ Full", "✓ All types"],
              ["Shapes", "✓ 20+ presets", "✓ All types"],
              ["Images", "✓ PNG/JPG/GIF", "✓ All types"],
              ["Tables", "✓ Styled cells", "—"]
            ]
          }
        ]
      }
    ]
  };
}

program.parse();
