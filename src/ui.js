import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";

export function showFileBox(stagedFiles){
    const fileList = stagedFiles.map(f => chalk.gray(`   - ${f.status} ${f.file}`)).join("\n");
    console.log(boxen(fileList, {
        padding: 1,
        margin: 1,
        title: "📂 Your Staged Files",
        titleAlignment: "center",
        borderColor: "cyan"
    }));
}

export function showMsgBox(msg){
    console.log(boxen(msg, {
        padding: 1,
        margin: 1,
        title: "💡 Suggested Commits messages",
        titleAlignment: "center",
        borderColor: "green"
    }));
}

export function finalBox(msg){
console.log(boxen(msg, {
            padding: 1,
            margin: 1,
            title: "✅ Final Commit Message",
            borderColor: "yellow",
            titleAlignment: "center",
        })
    );
}

export function spinner(text){
    return ora(text).start();
}
