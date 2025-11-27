#!/usr/bin/env node
import fs from "fs";
import readline from "readline";
import path, { resolve } from "path";
import os from "os";
import { env } from "process";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const globalConfigPath = path.join(os.homedir(), ".commitcraftsrc");

function ask(question){
  return new Promise(resolve=>rl.question(question, ans=> resolve(ans)));
}

(async () => {
  //check if env exists update tht always
  if (fs.existsSync(".env")){
    console.log("Local .env detected - configuring there.");

    const key = await ask("Enter your API key: ");

    if(!key){
      console.log("No key entered. Setup aborted.");
      rl.close();
      process.exit(1);
    }

    let envContent = fs.readFileSync(".env", "utf-8");
    envContent= envContent.replace(/^OPENROUTER_API_KEY=.*$/m, "");
    const newContent = envContent.trim() + `\nOPENROUTER_API_KEY=${key}\n`;

    fs.writeFileSync(".env", newContent);
    console.log("API key saved to .env successfully!!");
    rl.close();
    return;
  }

  // no .env -> using global config
  if (fs.existsSync(globalConfigPath)){
    const existing = fs.readFileSync(globalConfigPath, "utf-8").trim();
    console.log(`Existing global API key found at ${globalConfigPath}`);
    console.log(`Value: ${existing}`);

    const overwrite = await ask("Overwrite? (Y/N): ");
    if (overwrite.toLowerCase() !== "y"){
      console.log("keeping existing api key!!");
      rl.close();
      return;
    }
  }

  // getting new key
  const key = await ask("Enter your API key: ");

  if (!key){
    console.log("No key entered. Setup Aborted.");
    rl.close();
    process.exit(1);
  }
  fs.writeFileSync(globalConfigPath,  `OPENROUTER_API_KEY=${key}\n`);
  console.log(`API key saved globally at ${globalConfigPath}`);

  rl.close();
  
})();