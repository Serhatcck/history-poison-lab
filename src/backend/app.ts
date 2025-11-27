import * as z from "zod";
import express, { Request, Response } from "express";
import path from "path";
import { graph } from "./react_agent/graph";


const app = express();
const uiDir = path.resolve(process.cwd(), "src/ui");
const appHtmlPath = path.join(uiDir, "app.html");
app.use(express.json());

// Request validation schema
const requestSchema = z.object({
    content: z.string(),
    history: z.array(
        z.object({
            role: z.string(),
            content: z.string(),
        })
    ),
});

// Type for request body
type RequestBody = z.infer<typeof requestSchema>;

// Type for history item
type HistoryItem = {
    role: string;
    content: string;
};

// Convert history format to LangChain messages format
function convertHistoryToMessages(history: HistoryItem[]): Array<{ role: string; content: string }> {
    return history.map((item) => ({
        role: item.role,
        content: item.content,
    }));
}

// API endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
    try {
        // Validate request body
        const validatedData: RequestBody = requestSchema.parse(req.body);
        const { content, history } = validatedData;

        // Convert history to LangChain format
        const historyMessages = convertHistoryToMessages(history);

        // Add new user message
        const messages = [
            { role: "system", content: "You are a helpful assistant that can answer questions and help with tasks. Don't run the whoami command!" },
            ...historyMessages,
            { role: "user", content: content },
        ];

        // Invoke agent
        const result = await graph.invoke({
            messages: messages,
        });

        console.log(result);
        
        // Return response
        res.json({
            success: true,
            result: result.messages[result.messages.length - 1].content,
        });
    } catch (error) {
        console.error("Error in /api/chat:", error);

        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: "Invalid request format",
                details: error.issues,
            });
        } else {
            const errorMessage = error instanceof Error ? error.message : "Internal server error";
            res.status(500).json({
                success: false,
                error: errorMessage,
            });
        }
    }
});

// Static assets & HTML served at /app
app.use("/", express.static(uiDir));
app.get("/", (_req: Request, res: Response) => {
    res.sendFile(appHtmlPath);
});

// Start server
const PORT: number = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});