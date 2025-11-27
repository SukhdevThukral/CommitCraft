export function showHelp(){
    console.log(`
CommitCraft - A lightweight conventional commit assistant


Usage:
    commitcraft [options]
    
Options:
   --ai         Generate commit messages using AI
   (no ai)
   doctor       Diagnose common git issues
   help         Show this help menu
        
Examples:
    commitcraft --ai
    commitcraft (default: rule based commit generation)
    commitcraft doctor
    `);
}