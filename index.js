#!/usr/bin/env node
import 'dotenv/config'; // load env vars first
import { getStagedFiles, getDiff } from "./src/git.js";
import { genMessage } from "./src/messages.js";
import { showFileBox } from "./src/ui.js";
import { showMsgBox } from "./src/ui.js";
import { finalBox } from "./src/ui.js";
import sendTelemetry from './src/telemetry.js';
import { spinner } from "./src/ui.js";
import { undoCommit } from './src/undo.js';
import { showHelp } from "./src/cli-help.js";
import { execSync } from "child_process";
import chalk from "chalk";
import { generatePR } from './src/pr.js';
import readline from "readline";
import { genAIMessage } from "./src/ai.js";
import { multiCommit } from "./src/gitActions.js";
import { runDoctor } from './src/doctor.js';
import stripAnsi from 'strip-ansi'; // removes ansi codes that end up in commit msgs

// Telemetry must never crash the CLI (timeouts, offline, etc.)
try {
    Promise.resolve(sendTelemetry()).catch(() => {});
} catch {
    // ignore telemetry failures
}

// take cli args
const args = process.argv.slice(2);
const useAI = args.includes("--ai"); // ai flag

// ---------------------------- shared helpers ----------------------------

// ask one question and return the answer as a promise
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Builds the suggested message(s). With --ai it makes ONE message PER FILE,
// joined by a blank line (so multiCommit can split them into separate commits).
async function generateSuggestion(files) {
    if (!useAI) return genMessage(files);

    const messages = [];
    let i = 0;
    for (const file of files) {
        i++;
        const aiSpin = spinner(`Generating message for ${file.file} (${i}/${files.length})...`).start();
        try {
            const fileDiff = getDiff(file.file); // diff for this specific file
            const msg = await genAIMessage(fileDiff);
            messages.push(msg);
            aiSpin.succeed(`${file.file} done`);
        } catch (err) {
            aiSpin.fail(`Failed on ${file.file}`);
            throw err;
        }
    }
    return messages.map((msg) => msg.trim()).join("\n\n");
}

// Commits the final message. Multiple "type: ..." blocks become separate commits.
// Throws if the commit fails.
async function commitFinalMessage(finalMessage) {
    const hasMultipleCommits = (finalMessage.match(/\n{2,}(?=\w+:\s)/g) || []).length > 0;

    if (hasMultipleCommits) {
        console.log(chalk.green("Detected multiple commits, splitting automatically..."));
        await multiCommit(finalMessage);
    } else {
        console.log(chalk.green("Committing single combined message..."));
        execSync(`git commit -F -`, { input: finalMessage, stdio: "pipe" });
    }
}

// ------------------------------ commands --------------------------------

// help checking
if (args.includes("help") || args.includes("--help")) {
    showHelp();
    process.exit(0);
}

// doctor checking
if (args.includes("doctor") || args.includes("--doctor")) {
    runDoctor();
    process.exit(0);
}

if (args.includes("undo") || args.includes("--undo")) {
    undoCommit();
    process.exit(0);
}

if (args.includes("pr") || args.includes("--pr")) {
    generatePR();
    process.exit(0);
}

// ---------- auto commit + push feature => better dev workflow :3 ----------
// Same flow as normal mode (per-file messages, same boxes), then pushes.
if (args[0] == "push") {
    console.log(chalk.blue("\n [CommitCraft] Push Mode \n"));

    try {
        // stage everything
        console.log(chalk.white("📄 Staging changes..."));
        execSync("git add .", { stdio: "ignore" });

        const pushFiles = getStagedFiles();
        if (pushFiles.length === 0) {
            console.log(chalk.red("Nothing to commit."));
            process.exit(1);
        }

        showFileBox(pushFiles);

        const suggestMsg = await generateSuggestion(pushFiles);
        showMsgBox(suggestMsg);

        const answer = await ask(chalk.yellow("⌨️ Press enter to accept:\n"));
        const finalMessage = stripAnsi(answer.trim() || suggestMsg);
        finalBox(finalMessage);

        if (!finalMessage.trim()) {
            console.log(chalk.red("No commit message generated."));
            process.exit(1);
        }

        await commitFinalMessage(finalMessage);
        console.log(chalk.bold.green("\n✅ Commit(s) created successfully!"));

        console.log(chalk.white("⬆️ Pushing to remote..."));
        execSync("git push", { stdio: "inherit" });

        console.log(chalk.bold.green("\n✨ Push Complete!\n"));
        process.exit(0);
    } catch (err) {
        console.log(chalk.red("[ERROR] ❌ Push mode failed."));
        console.log(chalk.red(err?.message || err));
        const detail = err?.stderr?.toString().trim();
        if (detail) console.log(chalk.gray(detail));
        process.exit(1);
    }
}
// --------------------------------------------------------------------------

// ------------------------------ normal mode -------------------------------
const spin = spinner("Analysing staged files.....").start();
const stagedFiles = getStagedFiles();
spin.succeed('Staged files analyzed!');

if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    process.exit(1);
}

showFileBox(stagedFiles);

let suggestMsg;
try {
    suggestMsg = await generateSuggestion(stagedFiles);
} catch (err) {
    console.log(chalk.red(err?.message || err));
    process.exit(1);
}

showMsgBox(suggestMsg);

const answer = await ask(chalk.yellow("⌨️ Press enter to accept:\n"));
const finalMessage = stripAnsi(answer.trim() || suggestMsg);
finalBox(finalMessage);

if (!finalMessage.trim()) {
    console.log(chalk.red("No commit message generated."));
    process.exit(1);
}

try {
    await commitFinalMessage(finalMessage);
    console.log(chalk.bold.green("\n✅ Commit(s) created successfully!"));
} catch (err) {
    console.log(chalk.red("Commit failed, make sure to stage your changes!"));
    const detail = err?.stderr?.toString().trim();
    if (detail) console.log(chalk.gray(detail));
}