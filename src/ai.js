import fetch from "node-fetch";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export async function genAIMessage(diff){
    if (!diff || !diff.trim()) {
        return "chore: update files";
    }
    if (!OPENROUTER_API_KEY) {
        throw new Error("missing api key in env variables.");

    }
    
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

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

        ${diff}

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
