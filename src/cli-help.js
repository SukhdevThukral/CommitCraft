export function showHelp(){
    console.log(`
CommitCraft - A lightweight conventional commit assistant


Usage:
    commitcraft [options]
    
Options:
   1. --ai              Generate commit messages using AI
   2. (no ai)
   3. doctor            Diagnose common git issues
   4. help              Show this help menu
   5. push --ai         Directly stages all the changes made, generates commit message, commits and pushes changes to your repository 
   6. undo              Restores your repository to the previous commit
   7. pr                Generates polished PR message based on your latest commit history
        
Examples:
    commitcraft --ai
    commitcraft                # default (rule-based)
    commitcraft doctor
    commitcraft push --ai
    commitcraft undo
    commitcraft pr
    `);
}