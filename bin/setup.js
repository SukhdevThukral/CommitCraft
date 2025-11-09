#!/usr/bin/env node
import fs from "fs";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
//test2
rl.question("Enter your API Key: ", (key)=> {
    if (!key) {
      console.log("No key entered. Setup aborted.");
      rl.close();
      process.exit(1);  
    }

    let envContent = "";
    if (fs.existsSync(".env")){
      envContent = fs.readFileSync(".env", "utf-8");

      //removin the old wuns
      envContent= envContent.replace(/^OPENROUTER_API_KEY=.*$/m, "");
    }

    //addin new key
    const newContent = envContent.trim() + `\nOPENROUTER_API_KEY=${key}\n`;
    fs.writeFileSync(".env", newContent.trim() + "\n");
    console.log("API key saved to .env successfully!");
    rl.close();
});