#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";

const localEnvPath = ".env";
const globalConfigPath = path.join(os.homedir(), ".commitcraftsrc");

if (!fs.existsSync(localEnvPath) && !fs.existsSync(globalConfigPath)){
    console.log("\n CommitCraft setup not complete!");
    console.log("Run `npx commitcraft-setup` to configure your API key. \n");
}