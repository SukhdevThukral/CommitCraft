import fs from "fs";
import { execSync } from "child_process";
import chalk from "chalk";

export function runDoctor() {
    console.log(chalk.cyan("\n Running CommitCraft Doctor....\n"));

    //checking if inside a git repo
    try{
        execSync("git rev-parse --is-inside-work-tree", {stdio: "ignore"});
        console.log(chalk.green("✅ Inside a Git repository"));
    } catch {
        console.log(chalk.red("❌ Not inside a Git repository"));
        return;
    }

    //checking staged files
    const stagedFiles = execSync("git diff --name-only --cached").toString().trim().split("\n").filter(Boolean);

    if (stagedFiles.length > 0){
        console.log(chalk.green(`✅ ${stagedFiles.length} staged file(s)`));
    } else {
        console.log(chalk.yellow("⚠️  No staged files detected"));
    }

    // checking branch name
    const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    console.log(chalk.green(`✅ Current branch: ${branch}`));

    // checking for api key
    const home = process.env.HOME || process.env.USERPROFILE;
    const configPath = `${home}/.commitcraftsrc`;
    const localEnvPath = ".env";

    let keyFound = false;

    //checking global key
    if (fs.existsSync(configPath)){
        console.log(chalk.green(`✅ Global API key found at ${configPath}`));
        keyFound = true;
    }

    if (fs.existsSync(localEnvPath)){
        const envContent = fs.readFileSync(localEnvPath, "utf-8");
        if (/OPENROUTER_API_KEY\s*=\s*.+/.test(envContent)) {
            console.log(chalk.green(`✅ Local API key found in ${localEnvPath}`));
            keyFound = true;
        }
    }

    if (!keyFound){
        console.log(chalk.yellow("⚠️ No API key found (local or global)"));
        console.log(chalk.yellow("ℹ️ Run `commitcraft-setup` to configure your API key"));
    }

    console.log(chalk.cyan("\n🩺 CommitCraft Doctor finished.\n"));

}