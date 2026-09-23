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

// small helper: ask one question and return the answer as a promise
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

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

        let msg;
        if (useAI) {
            const aiSpin = spinner("Generating commit message with AI...").start();
            try {
                msg = await genAIMessage(getDiff());
                aiSpin.succeed("Commit message generated!");
            } catch (err) {
                aiSpin.fail("AI generation failed.");
                throw err;
            }
        } else {
            msg = genMessage(pushFiles);
        }

        console.log(chalk.white("\n Commit message suggestion: "));
        console.log(chalk.green(`${msg}\n`));

        const answer = await ask(chalk.yellow("Press Enter to accept / type to edit: "));
        const final = stripAnsi(answer.trim() || msg);

        console.log(chalk.white("💾 Committing..."));
        // -F - reads the message from stdin, so multi-line messages work on Windows too
        execSync("git commit -F -", { input: final, stdio: "pipe" });

        console.log(chalk.white("⬆️ Pushing to remote..."));
        execSync("git push", { stdio: "inherit" });

        console.log(chalk.bold.green("\n✨ Push Complete!\n"));
        process.exit(0);
    } catch (err) {
        console.log(chalk.red("[ERROR] ❌ Push mode failed."));
        console.log(chalk.red(err?.message || err));
        process.exit(1);
    }
}
// --------------------------------------------------------------------------

// ora spinner cool stuff
const spin = spinner("Analysing staged files.....").start();
const stagedFiles = getStagedFiles();
spin.succeed('Staged files analyzed!');

if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    process.exit(1);
}

showFileBox(stagedFiles);

let suggestMsg;
if (useAI) {
    const messages = [];
    let i = 0;
    for (const file of stagedFiles) {
        i++;
        const aiSpin = spinner(`Generating message for ${file.file} (${i}/${stagedFiles.length})...`).start();
        try {
            // diff for a specific file
            const fileDiff = getDiff(file.file);
            const msg = await genAIMessage(fileDiff);
            messages.push(msg);
            aiSpin.succeed(`${file.file} done`);
        } catch (err) {
            aiSpin.fail(`Failed on ${file.file}`);
            console.log(chalk.red(err?.message || err));
            process.exit(1);
        }
    }
    // combining all ai suggestions for all files
    suggestMsg = messages.map((msg) => msg.trim()).join("\n\n");
} else {
    suggestMsg = genMessage(stagedFiles);
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
    const hasMultipleCommits = (finalMessage.match(/\n{2,}(?=\w+:\s)/g) || []).length > 0;

    if (hasMultipleCommits) {
        console.log(chalk.green("Detected multiple commits, splitting automatically..."));
        multiCommit(finalMessage);
    } else {
        console.log(chalk.green("Committing single combined message..."));
        execSync(`git commit -F -`, { input: finalMessage, stdio: "pipe" });
    }

    console.log(chalk.bold.green("\n✅ Commit(s) created successfully!"));
} catch (err) {
    console.log(chalk.red("Commit failed, make sure to stage your changes!"));
    const detail = err?.stderr?.toString().trim();
    if (detail) console.log(chalk.gray(detail));
}