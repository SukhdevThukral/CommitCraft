// src/ai.js
// Uses Node's built-in fetch (Node 18+), so `node-fetch` is no longer needed.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Correct API endpoint (https://openrouter.ai alone is just the website).
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// "openrouter/free" is OpenRouter's Free Models Router: it picks a currently
// available free model for each request, so it never breaks when a specific
// ":free" model is retired. Override with OPENROUTER_MODEL if you want a fixed one.
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_DIFF_LINES = 3000;
const MAX_DIFF_CHARS = 12_000; // free models often have small effective context

export async function genAIMessage(diff) {
    if (!diff || !diff.trim()) {
        return "chore: update files";
    }
    if (!OPENROUTER_API_KEY) {
        throw new Error("Missing OPENROUTER_API_KEY in environment variables.");
    }

    const cleanedDiff = cleanGitDiff(diff);
    const prompt = buildPrompt(cleanedDiff);

    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            return await requestCommitMessage(prompt);
        } catch (err) {
            lastError = err;
            if (!err.retryable || attempt === MAX_ATTEMPTS) break;

            // Free tier is rate-limited / flaky. The router may pick a different
            // free model on the next try, so retrying often just works.
            const delay = err.empty ? 300 : 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
            await sleep(delay);
        }
    }

    throw lastError;
}

async function requestCommitMessage(prompt) {
    let response;
    try {
        response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "X-Title": "CommitCraft",
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.2,
                // Reasoning models spend tokens "thinking" before answering, so a
                // small limit leaves nothing for the actual message (empty reply).
                max_tokens: 2000,
                reasoning: { effort: "low" }, // ignored by models without reasoning
                messages: [{ role: "user", content: prompt }],
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (err) {
        throw makeError(`Network error: ${err.message}`, true);
    }

    const raw = await response.text();

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        throw makeError(
            `OpenRouter returned non-JSON (HTTP ${response.status}): ${raw.slice(0, 200)}`,
            response.status >= 500
        );
    }

    if (!response.ok || data.error) {
        const message = data.error?.message || JSON.stringify(data.error ?? data);
        const status = response.status;

        if (status === 401 || status === 403) {
            throw makeError(`OpenRouter auth failed (HTTP ${status}): ${message}. Check OPENROUTER_API_KEY.`, false);
        }
        if (status === 402) {
            throw makeError(`OpenRouter says payment is required (HTTP 402): ${message}`, false);
        }
        // 429 (rate limit), 5xx and provider hiccups are worth retrying.
        const retryable = status === 429 || status >= 500 || status === 408;
        throw makeError(`OpenRouter error (HTTP ${status}): ${message}`, retryable);
    }

    const content = data.choices?.[0]?.message?.content;
    const commitMessage = sanitizeMessage(content);

    if (!commitMessage) {
        // Some free models occasionally return an empty completion; retry.
        const reason = data.choices?.[0]?.finish_reason ?? "unknown";
        const emptyErr = makeError(
            `Empty response from model "${data.model ?? MODEL}" (finish_reason: ${reason}).`,
            true
        );
        emptyErr.empty = true;
        throw emptyErr;
    }

    return commitMessage;
}

function buildPrompt(cleanedDiff) {
    return `You are a professional software engineer.

Here are the staged changes in a git repository:

${cleanedDiff}

Generate a Git commit message based only on these changes.

Rules:
- Use conventional commit prefixes: feat, fix, chore, docs, test.
- Provide a concise 1-line header (50-72 characters max).
- Optionally add 2-4 bullet points for multiple files.
- DO NOT use Markdown, backticks, code blocks.
- DO NOT write examples, explanations, or summaries.
- DO NOT invent unrelated features.
- ONLY return the commit message text, nothing else.`;
}

// Free models sometimes wrap output in code fences or emit <think> blocks.
function sanitizeMessage(text) {
    if (typeof text !== "string") return "";

    return text
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```$/i, "")
        .replace(/`/g, "")
        .trim();
}

function cleanGitDiff(diff) {
    const lines = diff.split("\n");
    const output = [];
    let skipFile = false;
    let chars = 0;

    for (const line of lines) {
        if (line.startsWith("diff --git")) {
            skipFile =
                line.includes("package-lock.json") ||
                line.includes("yarn.lock") ||
                line.includes("pnpm-lock.yaml") ||
                line.includes(".min.js");
        }

        if (skipFile) continue;

        if (
            line.startsWith("diff --git") ||
            line.startsWith("---") ||
            line.startsWith("+++") ||
            line.startsWith("+") ||
            line.startsWith("-")
        ) {
            output.push(line);
            chars += line.length + 1;
        }

        if (output.length > MAX_DIFF_LINES || chars > MAX_DIFF_CHARS) {
            output.push("\n[Diff truncated... too many changes]");
            break;
        }
    }

    return output.join("\n");
}

function makeError(message, retryable) {
    const err = new Error(message);
    err.retryable = retryable;
    return err;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}