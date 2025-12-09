import {execSync} from "child_process";
import chalk from "chalk";
import { genAIMessage } from "./ai.js";

export async function generatePR() {
    try {
        const commits = execSync("git log -10 --pretty=format:%s").toString();

        const prompt = `
        
        using these commit messages, generate a professional github pull request description:

        Commits:
        ${commits}


        Format:
        ## Title
        ### Summary
        ### Changes
        - bullet points
        ### Additional notes (if any)
        `;
    
        const prMsg=  await genAIMessage(prompt);
        console.log(chalk.cyan("\n 📝 Your PR Message:\n"));
        console.log(prMsg);
        console.log(chalk.gray("\nCopy & paste into Github. \n"));
    } catch(err){
        console.log(chalk.red("[ERROR] Couldnt generate PR. Ensure commits exist."));
    }
}