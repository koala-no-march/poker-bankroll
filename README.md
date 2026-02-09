# Custom Agents and Skills Workspace

This workspace configures GitHub Copilot custom agents and skills for multi-role planning.

## Quick start
1. In VS Code Chat, select Agent mode.
2. Choose the "orchestrator" agent.
3. Describe the system you want to build.
4. Review the synthesized plan and refine as needed.

## Files
- .github/agents: agent definitions
- .github/skills: skill playbooks
- .github/prompts: slash-command prompts
- .github/copilot-instructions.md: global instructions

## Notes
- If skills do not trigger, confirm that "chat.useAgentSkills" is enabled.
- Restart VS Code after adding agents if they do not appear.
