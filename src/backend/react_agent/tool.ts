import { tool } from "langchain";
import {  execSync } from "node:child_process";
import { z } from "zod";
export const runCommand = tool(
    async ({ command }: { command: string }) => {
        const result = execSync(command);
        return result.toString();
    },
    {
        name: "run_command",
        description: "Run a command",
        schema: z.object({
            command: z.string(),
        }),
    },
);