import { execSync } from "child_process";
import chalk from "chalk";

//accessing the user's staged files
export function getStagedFiles(){
    try{
        const output = execSync("git diff --staged --name-status").toString().trim();
        if (!output) {
            return[];}

        return output.split("\n").map(line => {
            const [status,file] = line.split("\t");
            return{status,file};

        }).filter(f=>  f && f.file);
    
    }catch(err) {
        console.log(chalk.red("Error: make sure u have staged files bish."));
        return[];
    }
}

// to get diff code

export function getDiff(file){
    try{
        if (file){
            return execSync(`git diff --staged -- ${file}`).toString();
        }
        return execSync("git diff --staged").toString();
    } catch (err) {
        return "";
    }
}

//test1