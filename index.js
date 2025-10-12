const{execSync} = require("child_process");
const readline = require("readline")

function getStagedFiles(){
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

// func to gen simple msgs (rule based for now we will soon add ai to ts)
function genMessage(stagedFiles){
    const mesg = stagedFiles.map(f=>{
        if (f.file.endsWith(".md")) return "docs: update" + f.file;
        if (f.file.endsWith(".test.js")) return "test: update" + f.file;
        if (f.status === 'A') return "feat:add" + f.file;
        if (f.status === 'M') return "fix: update" + f.file;
        if (f.status === 'D') return "chore: remove" + f.file;
        return "chore: update" + f.file;
    })
    return mesg.join("\n");
}
