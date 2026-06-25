# AgentForge 🤖

Emran's AI agent project for community management.

This app is built to help manage community conversations, support replies, and project-specific knowledge with a custom AI assistant.

The app is password protected, and project data is saved in the browser so you do not need to retrain every time you reopen it in the same device and browser.

## Features

- Create and manage multiple AI projects
- Train an agent with project notes and uploaded files
- Use the agent for community support and reply workflows
- Keep the OpenAI key on the server through environment variables

## Run Locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## OpenAI API Key

Add your key to a local environment file so it stays on the server:

```bash
OPENAI_API_KEY=your_secret_key_here
```

Create a `.env.local` file in the project root, restart the dev server, and the app will use that key automatically.
For GitHub, keep secrets out of the repository. Use [.env.example](.env.example) as the template, and keep `.env.local` untracked.

## Workspace Password

Set `APP_PASSWORD` in `.env.local` if you want to lock the app behind a password.
The password screen protects access to the workspace, while your project data stays saved locally in the browser.

## Deploy to Vercel

1. Push the project to GitHub.
2. Open [vercel.com](https://vercel.com) and sign in with GitHub.
3. Import this repository as a new project.
4. Add `OPENAI_API_KEY` in the Vercel environment variables.
5. Deploy the project.

Vercel will detect this as a Next.js project automatically.
