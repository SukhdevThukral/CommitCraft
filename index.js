const{execSync} = require("child_process");
const readline = require("readline")

function stagedFiles (){
    try{
        const output = execSync("git diff --staged --name-status").toString();
        const lines = output.trim().split("\n").filter(line => line);
        return lines.map(line => {
            const [status,file] = line.split("\t");
            return (status,file);
        });
    }catch(err) {
        console.log("Error: make sure u have staged files bish.");
        process.exit(1)
    }
}