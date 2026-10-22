# Skill sources (fetched 2026-10-22)
- awwwards/  <- github.com/juliobsz/skills @ ea8f145, folder awwwards/ (MIT, LICENSE copied in). Companion /jury skill not copied.
- frontend-design/ <- github.com/anthropics/skills @ dbd4588, skills/frontend-design (Apache-2.0, LICENSE.txt). Same SKILL.md as anthropics/claude-code plugins/frontend-design.
- mcp.json.example -> copy to <repo>/.cursor/mcp.json; set API_KEY_21ST in the environment (never commit the key).
- Official shadcn skill: installed with `npx skills add shadcn/ui --skill shadcn --agent cursor -y --copy` (ui.shadcn.com/docs/skills). The CLI writes `.agents/skills/` and cannot target `.cursor/skills`, so the copied tree lives at `.cursor/skills/shadcn/`. 21st skills: `npx @21st-dev/cli install-skill`.
