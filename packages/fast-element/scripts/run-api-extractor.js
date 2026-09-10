import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const exportPaths = [
    {
        path: "./context.js",
        docsFolder: "context",
        configPath: path.resolve(__dirname, "../api-extractor.context.json"),
    },
    {
        path: "./declarative.js",
        docsFolder: "declarative",
        configPath: path.resolve(__dirname, "../api-extractor.declarative.json"),
    },
    {
        path: "./di.js",
        docsFolder: "di",
        configPath: path.resolve(__dirname, "../api-extractor.di.json"),
    },
    {
        path: "./ponyfills/dom-parts.js",
        docsFolder: "ponyfills/dom-parts",
        configPath: path.resolve(__dirname, "../api-extractor.dom-parts.json"),
    },
    {
        path: "./ponyfills/declarative-parts.js",
        docsFolder: "ponyfills/declarative-parts",
        configPath: path.resolve(__dirname, "../api-extractor.declarative-parts.json"),
    },
    {
        path: "./ponyfills/signals.js",
        docsFolder: "ponyfills/signals",
        configPath: path.resolve(__dirname, "../api-extractor.signals.json"),
    },
    {
        path: "./ponyfills/dom-scheduler.js",
        docsFolder: "ponyfills/dom-scheduler",
        configPath: path.resolve(__dirname, "../api-extractor.dom-scheduler.json"),
    },
    {
        path: "./arrays.js",
        docsFolder: "arrays",
        configPath: path.resolve(__dirname, "../api-extractor.arrays.json"),
    },
];

(function () {
    exportPaths.forEach(exportPath => {
        const docsFolder = path.resolve(__dirname, `../docs/${exportPath.docsFolder}`);
        // Create folders in the docs directory
        if (!fs.existsSync(docsFolder)) {
            fs.mkdirSync(docsFolder, { recursive: true });
        }

        // Load and parse the api-extractor.json file
        const extractorConfig = ExtractorConfig.loadFileAndPrepare(exportPath.configPath);

        // Invoke API Extractor
        const extractorResult = Extractor.invoke(extractorConfig, {
            // Equivalent to the "--local" command-line parameter
            localBuild: process.argv[2] !== "ci",
        });

        if (extractorResult.succeeded) {
            console.log(
                `API Extractor completed successfully for ${exportPath.configPath}`,
            );
        } else {
            console.error(
                `API Extractor completed with ${extractorResult.errorCount} errors` +
                    ` and ${extractorResult.warningCount} warnings for ${exportPath.configPath}`,
            );
        }
    });
})();
