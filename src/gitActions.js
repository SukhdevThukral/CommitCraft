import {exec, execSync} from "child_process";
import chalk from "chalk";

//shoutout to big boy ravi 
export function multiCommit(aiOutput) {
    const sections = aiOutput.split(/\n{2,}(?=\w+:\s)/g).map(s=>s.trim()).filter(Boolean);
    let stagedFiles;

    try{
        stagedFiles = execSync("git diff --cached --name-only").toString().trim().split("\n").filter(Boolean)
    } 
    catch(err){
        console.log(chalk.red("Failed to retrieve files."));
        return;
    }

    if (sections.length === 0 || stagedFiles.length === 0){
        console.log(chalk.red("No commit msgs or staged files found."));
        return;
    }

    console.log(chalk.green(`\n staged ${stagedFiles.length} files.`));
    console.log(chalk.green(`found ${sections.length} commit messages.`));

    const commitCount = Math.min(stagedFiles.length, sections.length);

    for (let i=0; i< commitCount; i++){
        const fileToCommit = stagedFiles[i];
        const section = sections[i];

        const [titleLine, ...bodyLines] = section.split("\n");
        const msg = `${titleLine}\n\n${bodyLines.join("\n")}`;

        console.log(chalk.cyan(`\n Commiting [${fileToCommit}]: ${titleLine}`));

        try{
            //temp unstaging and then restaging one by one
            execSync(`git restore --staged .`);
            execSync(`git add "${fileToCommit}"`);
            
            execSync(`git commit --file - -- "${fileToCommit}"`, {
                input: msg,
                stdio: ["pipe", "inherit", "inherit"],
            });



            const remainingFiles = stagedFiles.slice(i + 1);
            if (remainingFiles.length > 0){
                for (const f of remainingFiles){
                    execSync(`git add "${f}"`);
                }
            }
    }catch(err){
      console.log(chalk.red(`commit failed for file ${fileToCommit}\n`), msg);
    }
    //if extra files exist but no mor msgs, commit together
    if (stagedFiles.length > commitCount){
        const remainingFiles = stagedFiles.slice(commitCount);
        console.log(chalk.yellow(`\n ${remainingFiles.length} extra files - commiting together.`));
        try{
            execSync(`git commit -m "chore:auto-commit remaining files" -- ${remainingFiles.map(f=> `"${f}"`)
        .join(" ")}`, {stdio:"inherit"});

        }
        catch(err){
            console.log(chalk.red("Failed to commit remaining files."));
        }
    }
    console.log(chalk.green.bold("\nAll commits completed successfully!"));
}}