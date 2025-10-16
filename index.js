#!/usr/bin/env node
import 'dotenv/config'; // load env vars first
import { getStagedFiles, getDiff } from "./src/git.js";
import { genMessage } from "./src/messages.js";
import { showFileBox, showMsgBox, finalBox, spinner } from "./src/ui.js";
import { execSync } from "child_process";
import chalk from "chalk";
import readline from "readline";
import { genAIMessage } from "./src/ai.js";
import stripAnsi from "strip-ansi";

// CLI args
const args = process.argv.slice(2);
const useAI = args.includes("--ai");

// Spinner
const spin = spinner("Analyzing staged files...").start();
const stagedFiles = getStagedFiles();
spin.succeed("Staged files analyzed!");

if (stagedFiles.length === 0) {
    console.log(chalk.red("❌ No staged files found."));
    process.exit(1);
}

showFileBox(stagedFiles);

if (useAI) {
    // AI-powered per-file commits
    for (const file of stagedFiles) {
        try {
            const fileDiff = getDiff(file.file);
            const msg = await genAIMessage(file.file, fileDiff);
            const cleanMsg = stripAnsi(msg.trim());

            execSync(`git add ${file.file}`);
            execSync(`git commit -m "${cleanMsg}"`, { stdio: "inherit" });

            console.log(chalk.green(`✅ Committed ${file.file}`));
        } catch (err) {
            console.log(chalk.red(`❌ Failed to commit ${file.file}: ${err.message}`));
        }
    }

    // Exit after all commits
    process.exit(0);
} else {
    // Fallback: single commit for all staged files
    const suggestMsg = genMessage(stagedFiles);
    const finalMsg = stripAnsi(suggestMsg);

    showMsgBox(finalMsg);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(chalk.yellow("⌨️ Press enter to accept:\n"), (answer) => {
        const finalMessage = stripAnsi(answer || finalMsg);
        finalBox(finalMessage);

        try {
            execSync(`git commit -F -`, { input: finalMessage, stdio: "pipe" });
            console.log(chalk.green("✅ Commit created!"));
        } catch (err) {
            console.log(chalk.red("❌ Commit failed: make sure files are staged!"));
        }

        rl.close();
    });
}
