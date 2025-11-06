### 🌐 Live Demo  
🚀 https://xenai-master.vercel.app

# 🚀 XenAI – AI Powered Code Reviewer Using LLM
XenAI is an intelligent cloud-based code review and collaborative coding platform.  
It uses Large Language Models (LLMs) to analyze, review, optimize, and debug code just like a senior software engineer — in real time.

Designed for students, developers, and engineering teams, XenAI combines **AI-assisted code review + live collaboration + GitHub integration** inside a modern web IDE.

## 🎯 Project Objective

To develop a next-generation virtual code reviewer capable of:

- Understanding & reviewing code using LLMs  
- Detecting bugs, vulnerabilities, and performance issues  
- Suggesting optimized & clean code  
- Explaining code logic and debugging steps  
- Supporting real-time collaborative coding  
- Integrating with GitHub for commits & workflow  

---

## 🧠 Key Features

### 🤖 AI Code Review
- Code quality review using LLMs (LangChain + Gemini)
- Suggestions for performance, security & style
- Debugging assistance with explanation
- Auto-commenting & documentation generation

### 👥 Real-Time Collaboration
- Multi-user live coding (like Google Docs + VSCode)
- Live cursor tracking & presence indicators
- Workspace invitations and team roles

### 🔐 Authentication
- Firebase Auth (Google + Email)
- Protected routes & secure sessions

### 🔧 Developer Tools
- VSCode-style Monaco Editor
- GitHub Login + Auto Commit
- File explorer & workspace management
- Theming (Dark/Light), modern UI animations

---

## 🏗️ System Architecture

| Layer | Technology |
|------|-----------|
Frontend | Next.js 14, React, Tailwind, ShadCN |
AI Engine | LangChain + Google Gemini |
Authentication | Firebase Auth + GitHub OAuth |
Database | Firebase Firestore + Realtime DB |
Editor | Monaco Editor |
Version Control | GitHub API |
Hosting | Vercel / Firebase |

---

## 📂 Directory Structure

XenAI/
├── docs/ # Report, Certificates, Paper
├── src/
│ ├── app/ # Next.js pages & routing
│ ├── components/ # UI components
│ ├── context/ # App + Auth providers
│ ├── hooks/ # Custom hooks
│ ├── helpers/ # Helper functions
│ ├── config/ # Firebase config
│ ├── lib/ # Utility functions
│ └── utils/ # Utility modules
└── public/ # Static files

yaml
Copy code

---

## ⚙️ Getting Started

### ✅ Clone Repo

```bash
git clone https://github.com/Syed70/XenAi-Master.git
cd XenAi-Master
✅ Install Dependencies
bash
Copy code
npm install
✅ Environment Variables
Create .env.local and add:

env
Copy code
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

NEXT_PUBLIC_GOOGLE_AI_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
Never commit .env.local — keep secrets private.

▶️ Run App
bash
Copy code
npm run dev
Visit:

arduino
Copy code
http://localhost:3000
🚀 Future Enhancements
Feature	Status
AI Copilot Autocomplete	Coming soon
AI Bug Fix Automation	Planned
VS Code Extension	Planned
Voice-to-Code	Research
Execution Sandbox	Future
Multi-language Code Support	Python, C++, Java planned
Cloud Workspace	Planned

📎 Project Documents
Located in /docs folder:
Project Report ✅
Research Paper ✅
Certificates ✅

👨‍💻 Team Members
Name	Role
Syed Abdulla : Lead Developer / Full Stack Engineer
Moin Ahmed : Developer
Prathap Sharma : Developer
Sumit Lalasingi	: Developer
Guide	Faculty Mentor, CSE Dept

⭐ How to Support
If you found this useful, please ⭐ the repo — it motivates us!

📬 Contact
Email: syedabdulla442@gmail.com
GitHub: @Syed70

