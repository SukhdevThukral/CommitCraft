#!/usr/bin/env node
//shebang?? T-T
import 'dotenv/config'; //load env vars first 
import { getStagedFiles, getDiff } from "./src/git.js";
import { genMessage } from "./src/messages.js";
import { showFileBox } from "./src/ui.js";
import { showMsgBox } from "./src/ui.js";
import { finalBox } from "./src/ui.js";
import { spinner } from "./src/ui.js";
import { execSync } from "child_process";
import chalk from "chalk";
import readline from "readline";
import { genAIMessage } from "./src/ai.js";
import { multiCommit } from "./src/gitActions.js";
import stripAnsi from 'strip-ansi'; // will remove all the ansi codes tht persist in my commit msgs rn


//take cli args
const args = process.argv.slice(2);
const useAI = args.includes("--ai"); //ai flag

//ora spinner cool shit
const spin = spinner("Analysing staged files.....").start();
const stagedFiles = getStagedFiles();
spin.succeed('Staged files analyzed!')


if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    process.exit(1);
}

showFileBox(stagedFiles);


//this is supposed to be interface for my cli
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const diff = getDiff();

let suggestMsg;
if (useAI) {
    const messages=[];
    for (const file of stagedFiles){
        //diff for a specific file
        const fileDiff = getDiff(file.file);

        //callin AI for this file's diff
        const msg = await genAIMessage(fileDiff);
        messages.push(msg);
    }
    //combinin all ai suggestion for all files
    suggestMsg =  messages.map(msg=>msg.trim()).join("\n\n");
}else{
    suggestMsg = genMessage(stagedFiles);
}

showMsgBox(suggestMsg);

rl.question(chalk.yellow("⌨️ Press enter to accept:\n"), (answer)=> {
    const finalMessage = stripAnsi(answer || suggestMsg);
    finalBox(finalMessage);

    if (!finalMessage.trim()){
        console.log(chalk.red("No commit message generated."));
        rl.close();
        process.exit(1)
    }

    try{
        const hasMultipleCommits = (finalMessage.match(/\n{2,}(?=\w+:\s)/g) || []).length>0;

        if (hasMultipleCommits){
            console.log(chalk.green("Detected multiple commits, splitting automatically..."));
            multiCommit(finalMessage);
        }
        
        else{
            console.log(chalk.green("Committing single combined message..."));
            execSync(`git commit -F -`, { input: finalMessage, stdio: "pipe" });
        }

        console.log(chalk.bold.green("\n✅ Commit(s) created successfully!"));
    } catch(err){
        console.log(chalk.red("Commit failed, make sure to stage your changes!"));
    }
    //     execSync(`git commit -F -`,{input: finalMessage,  stdio: "pipe"});
    //     console.log(chalk.green(chalk.bold("commit created !!!")));
    // }catch(err){
    //     console.log(chalk.red("commit failed make sure to stage your changes!!"));
    // }
    rl.close();
});