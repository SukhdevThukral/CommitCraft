#!/usr/bin/env node
//shebang?? T-T
import { execSync } from "child_process";
import readline from "readline";
import chalk from "chalk";
// func to get access to staged files
function getStagedFiles(){
    try{
        const output = execSync("git diff --staged --name-status").toString();
        const lines = output.trim().split("\n").filter(line => line);
        return lines.map(line => {
            const [status,file] = line.split("\t");
            return {status,file};
        });
    }catch(err) {
        console.log(chalk.red("Error: make sure u have staged files bish."));
        process.exit(1)
    }
}

// func to gen simple msgs (rule based for now we will soon add ai to ts)
function genMessage(stagedFiles){
    const mesg = stagedFiles.map(f=>{
        if (f.file.endsWith(".md")) return `📖 ${chalk.blue("docs:")} update ${f.file}`;
        if (f.file.endsWith(".test.js")) return `🧪 ${chalk.magenta("test:")} update ${f.file}`;
        if (f.status === 'A') return `🧪 ${chalk.green("feat:")} add ${f.file}`;
        if (f.status === 'M')  return `🛠️ ${chalk.yellow("fix:")} update ${f.file}`;
        if (f.status === 'D') return `🗑️ ${chalk.red("chore:")} remove ${f.file}`;
        return `📦 ${chalk.cyan("chore:")} update ${f.file}`;
    })
    return mesg.join("\n");
}


//interface for cli
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    process.exit();
}

console.log(chalk.cyan.bold("\n 📂 Your Staged files:"));
stagedFiles.forEach(f => {
    console.log(chalk.gray(`   - ${f.status} ${f.file}`));
});

const suggestMsg = genMessage(stagedFiles);

console.log(chalk.bold.green("💡 Suggested commit message:\n"));
console.log(suggestMsg + "\n");

rl.question(chalk.yellow("⌨️ Press enter to accept:\n"), (answer)=> {
    const finalMessage = answer || suggestMsg;
    console.log(chalk.bold.green("\n Final commit msg:\n") + finalMessage);

    // auto commit after accepting
    try{
        execSync(`git commit -m "${finalMessage}"`, { stdio: "inherit"});
        console.log(chalk.green(chalk.bold("commit created !!!")));
    }catch(err){
        console.log(chalk.red("commit failed make sure to stage your changes!!"));
    }
    rl.close();
});

// testing with my own repo ;(