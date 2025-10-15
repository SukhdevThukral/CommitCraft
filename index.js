#!/usr/bin/env node
//shebang?? T-T

import { getStagedFiles, getDiff } from "./src/git";
import { genMessage } from "./src/messages";
import { showFileBox } from "./src/ui";
import { showMsgBox } from "./src/ui";
import { finalBox } from "./src/ui";
import { spinner } from "./src/ui";
import { execSync } from "child_process";
import readline from "readline";
import stripAnsi from 'strip-ansi'; // will remove all the ansi codes tht persist in my commit msgs rn
//ora spinner cool shit
const spin = spinner("Analysing staged files.....").start();
const stagedFiles = getStagedFiles();
spin.succeed('Staged files analyzed!')


if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    process.exit(1);
    
}

showFileBox(stagedFiles);

//interface for cli
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(chalk.yellow("⌨️ Press enter to accept:\n"), (answer)=> {
    const finalMessage = stripAnsi(answer || suggestMsg);
    finalBox(finalMessage);

    // auto commit after accepting
    try{
        execSync(`git commit -F -`,{input: finalMessage,  stdio: "inherit"});
        console.log(chalk.green(chalk.bold("commit created !!!")));
    }catch(err){
        console.log(chalk.red("commit failed make sure to stage your changes!!"));
    }
    rl.close();
});

// testing with my own repo ;(