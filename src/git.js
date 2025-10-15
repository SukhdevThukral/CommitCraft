import { execSync } from "child_process";
import chalk from "chalk";

//accessing the user's staged files
export function getStagedFiles(){
    try{
        const output = execSync("git diff --staged --name-status").toString();
        return output.trim().split("\n").filter(line => line).map(line => {
            const [status,file] = line.split("\t");
            return{status,file};

        });
    
    }catch(err) {
        console.log(chalk.red("Error: make sure u have staged files bish."));
        process.exit(1)
    }
}

// to get diff code

export function getDiff(){
    return execSync("git diff --staged").toString();
}