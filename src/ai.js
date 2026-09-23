import fetch from "node-fetch";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export async function genAIMessage(diff){
    if (!diff || !diff.trim()) {
        return "chore: update files";
    }
    if (!OPENROUTER_API_KEY) {
        throw new Error("missing api key in env variables.");

    }

    const cleanedDiff = cleanGitDiff(diff);
    
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

    const response = await fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-goog-api-key" : OPENROUTER_API_KEY
    },
    body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `
        You are a professional software engineer.

        Here are the staged changes in a git repository:

        ${cleanedDiff}

        Generate a Git commit message **based only on these changes**.

        Rules:
        - Use conventional commit prefixes: feat, fix, chore, docs, test.
        - Provide a concise 1-line header (50–72 characters max).
        - Optionally add 2–4 bullet points for multiple files.
        - DO NOT use Markdown, backticks, code blocks.
        - DO NOT write examples, explanations, or summaries.
        - DO NOT invent unrelated features.
        - ONLY return the commit message text, nothing else.

        `
             }]
         }]
        })
    });

    const data = await response.json();

    if (data.error){
        throw new Error(`Gemini Error (${data.error.code}): ${data.error.message}`);
    }

    const commitMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!commitMessage){
        throw new Error("No response from Gemini :("+ JSON.stringify(data,null,2));
    }

    return commitMessage.trim();
}

function cleanGitDiff(diff) {
    const lines = diff.split("\n");
    let output = [];
    let skipFile = false;

    for (const line of lines) {
        // Skip lockfiles, build artifacts, or minified files entirely
        if (line.startsWith("diff --git")) {
            skipFile = line.includes("package-lock.json") || 
                       line.includes("yarn.lock") || 
                       line.includes("pnpm-lock.yaml") ||
                       line.includes(".min.js");
        }

        if (skipFile) continue;

        // Keep file headers and actual code changes, skip metadata lines to save space
        if (line.startsWith("diff --git") || line.startsWith("---") || line.startsWith("+++") || line.startsWith("+") || line.startsWith("-")) {
            output.push(line);
        }

        // Hard cap at roughly ~10,000 lines max to prevent huge token spikes
        if (output.length > 5000) {
            output.push("\n[Diff truncated... too many changes]");
            break;
        }
    }

    return output.join("\n");
}
