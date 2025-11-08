import fetch from "node-fetch";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export async function genAIMessage(diff){
     if (!diff || !diff.trim()) {
        return "chore: update files";
    }
    //test6

    if (!OPENROUTER_API_KEY) {
        throw new Error("missing api key in env variables.");

    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            //shit arch, had to ai gen cause i gave up fuckass ai gave up too sheesh testing testing
        content: `
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
    })
    });
    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content){
        throw new Error("No response from OpenRouter :("+ JSON.stringify(data,null,2));
    }

    return data.choices[0].message.content.trim();
}
