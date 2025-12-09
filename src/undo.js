import {execSync} from "child_process";
import chalk  from "chalk";

export function undoCommit(){
    try{
        execSync("git reset --soft HEAD~1");
        console.log(chalk.green("\n↩ Last commit reverted & changes restored to staging.\n"))

    } catch (err) {
        console.log(chalk.red("[ERROR] Failed: are you repo has a commit?"))
    }
}