#!/usr/bin/env node
import fs from "fs";
if (!fs.existsSync(".env")){
    console.log("\n CommitCraft setup not complete!");
    console.log("Run `npx commitcraft-setup` to configure your API key. \n");
}
//test2