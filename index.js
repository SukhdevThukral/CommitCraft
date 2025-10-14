#!/usr/bin/env node
//shebang?? T-T
import { execSync } from "child_process";
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";

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

//ora spinner cool shit
const spin = ora("Analysing staged files.....").start();
const stagedFiles = getStagedFiles();
spin.succeed('Staged files analyzed!')


if (stagedFiles.length === 0) {
    console.log(chalk.red("file not found"));
    spin.fail("No staged files found.");
    process.exit(1);
    
}
const fileList = stagedFiles.map(f => chalk.gray(`   - ${f.status} ${f.file}`)).join("\n");
console.log(boxen(fileList, {
    padding: 1,
    margin: 1,
    title: "📂 Your Staged Files",
    titleAlignment: "center",
    borderColor: "cyan"
}));


const suggestMsg = genMessage(stagedFiles);

console.log(boxen(suggestMsg, {
    padding: 1,
    margin: 1,
    title: "💡 Suggested Commits messages",
    titleAlignment: "center",
    borderColor: "green"
}));

//interface for cli
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(chalk.yellow("⌨️ Press enter to accept:\n"), (answer)=> {
    const finalMessage = answer || suggestMsg;
    console.log(boxen(finalMessage, {
            padding: 1,
            margin: 1,
            title: "✅ Final Commit Message",
            borderColor: "yellow",
            titleAlignment: "center",
        })
    );

    // auto commit after accepting
    try{
        execSync(`git commit -m "${finalMessage.replace(/\n/g, '" -m "')}"`, { stdio: "inherit"});
        console.log(chalk.green(chalk.bold("commit created !!!")));
    }catch(err){
        console.log(chalk.red("commit failed make sure to stage your changes!!"));
    }
    rl.close();
});

// testing with my own repo ;(
//testing 2 :(