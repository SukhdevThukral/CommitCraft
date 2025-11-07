import {execSync} from "child_process";
import chalk from "chalk";

//shoutout to big boy ravi 
export function multiCommit(aiOutput) {

    const sections = aiOutput.split(/\n{2,}(?=\w+:\s)/g).map(s=>s.trim()).filter(Boolean);

    let stagedFiles;
    try{

        stagedFiles = execSync("git diff --cachede --name-only").toString().trim().split("\n").filter(Boolean)

    } catch(err){
        console.log(chalk.red("Failed to retrieve files."));
        return;
    }

    if (sections.length === 0 || stagedFiles.length === 0){
        console.log(chalk.red("No commit msgs or staged files found."));
        return;
    }
    for (const section of sections) {
        const [titleLine, ...bodyLines] = section.split("\n").map(line => line.trim());
        const message = `${titleLine}\n\n${bodyLines.join("\n")}`;
        
        console.log(chalk.cyan(`\n Committing: ${titleLine}`));

        try{
            // findin changed files in staging area
            const changedFiles = execSync("git diff --cached --name-only").toString().trim().split("\n").filter(Boolean);
            if (changedFiles.length === 0){
                console.log(chalk.yellow("No more staged files left to commit."));
                break;
            }

            // commit one file/section
            const fileToCommit = changedFiles[0];
            execSync(`git commit -m "${message.replace(/"/g, '\\"')}" -- "${fileToCommit}"`, { stdio: "inherit" });
        } 
        catch(err){
            console.log(chalk.red("Commit failed for section:\n"), message);
        }
    }
}