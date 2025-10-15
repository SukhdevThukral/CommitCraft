import chalk from "chalk";

// func to gen simple msgs (rule based for now we will soon add ai to ts)
export function genMessage(stagedFiles){
    const mesg = stagedFiles.map(f=>{
        if (f.file.endsWith(".md")) return `📖 ${chalk.blue("docs:")} update ${f.file}`;
        if (f.file.endsWith(".test.js")) return `🧪 ${chalk.magenta("test:")} update ${f.file}`;
        if (f.status === 'A') return `🧪 ${chalk.green("feat:")} add ${f.file}`;
        if (f.status === 'M')  return `🛠️ ${chalk.yellow("fix:")} update ${f.file}`;
        if (f.status === 'D') return `🗑️ ${chalk.red("chore:")} remove ${f.file}`;
        return `📦 ${chalk.cyan("chore:")} update ${f.file}`;
    })
    return mesg.join("\n");
}