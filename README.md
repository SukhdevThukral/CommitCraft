Quit writing boring and useless commit messages - generate clean, meaningful commits automatically

![GitHub stars](https://img.shields.io/github/stars/SukhdevThukral/CommitCraft?style=social)
![Node.js](https://img.shields.io/badge/node-%3E%3D14-brightgreen)


## Introduction

We all hate writing commit messages like:


- "fix"
- "final final fix"
- "update file"

CommitCraft is capable of generating **clean, readable, meaningful commit messages automatically** based on your staged changes

## Features

- Reads your **staged files** in your repository
- Suggests **meaningful and relevant commit messages** using a simple rule based system (for now ;( )
- Lets you **accept or edit** the suggested message
- Easy to install and run.

## Installation

1. Clone this repo

``` bash
git clone https://github.com/SukhdevThukral/CommitCraft.git
cd CommitCraft
```

2. Stage your files

``` bash
git add .
```

3. Run CommitCraft (make sure you have node and npm installed)

``` bash
node index.js
```

4. Accept or edit the suggested commit message and press Enter


## How it works
1. Reads your staged files using `git diff --staged --name-status`
2. Generates simple commit message based on few rules;
    - Added files → `feat: add <file>`
   - Modified files → `fix: update <file>`
   - Deleted files → `chore: remove <file>`
   - Docs → `docs: update <file>`
   - Tests → `test: update <file>`
3. Prompts user to accept or edit the message

## Roadmap
- [ ] Add AI-powered commit suggestions
- [ ] Git hook integration for automatic suggestions
- [ ] Direct git commits
- [ ] Configurable commit styles
