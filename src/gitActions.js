import {execSync} from "child_process";
import chalk from "chalk";

//shoutout to big boy ravi 
export function multiCommit(aiOutput) {

    const sections = aiOutput.split(/\n{2,}(?=\w+:\s)/g).map(s=>s.trim()).filter(Boolean);

    for (const section of sections) {
        const [titleLine, ...bodyLines] = section.split("\n").map(line => line.trim());
        const message = `${titleLine}\n\n${bodyLines.join("\n")}`;
        
        console.log(chalk.cyan(`\n Committing: ${titleLine}`));

        try{
            // re-adding of all the files to ensure each section has content for a valid commit.
            execSync("git add -A");

            // creating commit
            execSync(`git commit -m "${message}"`, { stdio: "inherit" });
        } catch(err){
            console.log(chalk.red("Commit failed for section:\n"), message);
        }
    }
}