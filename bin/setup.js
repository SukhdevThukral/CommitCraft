#!/usr/bin/env node
import fs from "fs";
import readline from "readline";
import path from "path";
import os from "os";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const globalConfigPath = path.join(os.homedir(), ".commitcraftrc");

rl.question("Enter your API Key: ", (key)=> {
    if (!key) {
      console.log("No key entered. Setup aborted.");
      rl.close();
      process.exit(1);  
    }

    if (fs.existsSync(".env")){
      let envContent = fs.readFileSync(".env", "utf-8");

      //removin the old wuns
      envContent= envContent.replace(/^OPENROUTER_API_KEY=.*$/m, "");
    
      //addin new key
      const newContent = envContent.trim() + `\nOPENROUTER_API_KEY=${key}\n`;
      fs.writeFileSync(".env", newContent.trim() + "\n");
      console.log("API key saved to .env successfully!");
    } else {
      //saving globally
      fs.writeFileSync(globalConfigPath, `OPENROUTER_API_KEY=${key}\n`);
      console.log(`API key saved globally at ${globalConfigPath}`);
    }
    rl.close();
});