import os from "os";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

const userIdFile = path.join(os.homedir(), "commitcraft_Id");

function userIdGET(){
    if(fs.existsSync(userIdFile)){
        return fs.readFileSync(userIdFile, "utf-8");
    }

    const newId = uuidv4();
    fs.writeFileSync(userIdFile, newId);
    return newId;
}

export default function sendTelemetry() {
    const userId = userIdGET();

    fetch ("https://commitcraft-analytics.vercel.app/api/ping", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({userId})
    }).catch(()=>{
        //do nthg ::ppp (never break cli)
    });
}