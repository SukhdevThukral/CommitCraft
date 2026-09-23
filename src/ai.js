// src/ai.js
// Uses Node's built-in fetch (Node 18+), so `node-fetch` is no longer needed.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Correct API endpoint (https://openrouter.ai alone is just the website).
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// "openrouter/free" is OpenRouter's Free Models Router: it picks a currently
// available free model for each request, so it never breaks when a specific
// ":free" model is retired. Override with OPENROUTER_MODEL if you want a fixed one.
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const MAX_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 20_000; // fail fast, then retry
const DEBUG = Boolean(process.env.OPENROUTER_DEBUG);
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
    const prompt = buildPrompt(cleanedDiff, extractFiles(diff));

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
    const started = Date.now();
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
        throw makeError(describeNetworkError(err), true);
    }

    let raw;
    try {
        raw = await response.text();
    } catch (err) {
        // The timeout can also fire while the body is still downloading.
        throw makeError(describeNetworkError(err), true);
    }

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
    const commitMessage = formatCommitMessage(sanitizeMessage(content));

    if (commitMessage && !looksLikeCommit(commitMessage)) {
        // The router can pick odd models (e.g. safety classifiers that answer
        // "User Safety: safe"). Reject anything that isn't a real commit message.
        const bad = commitMessage.replace(/\s+/g, " ").slice(0, 80);
        const badErr = makeError(
            `Model "${data.model ?? MODEL}" did not return a commit message: "${bad}"`,
            true
        );
        badErr.empty = true; // retry quickly; the router will pick another model
        throw badErr;
    }

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

    if (DEBUG) {
        console.error(`[openrouter] ${data.model ?? MODEL} answered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }

    return commitMessage;
}

function buildPrompt(cleanedDiff, files) {
    const fileList = files.length ? files.map((f) => `- ${f}`).join("\n") : "- (unknown)";

    return `You are a professional software engineer writing a git commit message.

Changed files:
${fileList}

Staged diff (lines starting with + were added, - were removed):
${cleanedDiff}

Write ONE commit message in EXACTLY this format:

<type>: <short summary of the whole commit>

- <what changed in the first file or area>
- <what changed in the next file or area>

Rules:
- The FIRST line is the only header. It must start with one of: feat, fix, chore, docs, test, refactor. Keep it under 72 characters.
- Then one blank line.
- Then bullet lines starting with "- ". Write ONE bullet for EVERY changed file, describing specifically what changed in it (mention function, variable, or behavior names from the diff). Never start a bullet with a type prefix like "chore:".
- Describe only what is visible in the diff. Do not invent anything.
- No Markdown, no backticks, no code blocks, no explanations, no extra text before or after.

Example of a correct answer:

fix: use correct OpenRouter endpoint and add retries

- src/ai.js: change API URL to /api/v1/chat/completions and retry on 429 and empty replies
- src/telemetry.js: remove node-fetch import and use built-in fetch
- package.json: drop node-fetch dependency and set engines to node >=18

Now write the commit message for the staged diff above.`;
}

// List the changed file paths from "diff --git a/x b/x" lines.
function extractFiles(diff) {
    const files = [];
    for (const line of diff.split("\n")) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
        if (match && !files.includes(match[2])) files.push(match[2]);
    }
    return files;
}

// Some models ignore the format and return several "type: ..." lines.
// Keep the first as the header and turn the rest into "- " bullets.
function formatCommitMessage(text) {
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return "";

    const prefix = /^(feat|fix|chore|docs|test|refactor|style|perf|build|ci)(\([^)]*\))?!?:\s*/i;
    const stripBullet = (l) => l.replace(/^[-*\u2022]\s*/, "");

    const header = stripBullet(lines[0]);
    const bullets = lines
        .slice(1)
        .map((l) => stripBullet(l).replace(prefix, "").trim())
        .filter(Boolean)
        .slice(0, 12);

    return bullets.length
        ? [header, "", ...bullets.map((b) => `- ${b}`)].join("\n")
        : header;
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
            line.startsWith("@@") ||
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

function looksLikeCommit(message) {
    const header = message.split("\n")[0];
    return /^(feat|fix|chore|docs|test|refactor|style|perf|build|ci)(\([^)]*\))?!?:\s+\S/i.test(header);
}

function describeNetworkError(err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s (the free model was too slow).`;
    }
    return `Network error: ${err?.message ?? err}`;
}

function makeError(message, retryable) {
    const err = new Error(message);
    err.retryable = retryable;
    return err;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}