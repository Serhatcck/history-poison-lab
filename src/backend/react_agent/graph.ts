import { AIMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { loadChatModel } from "./utils";
import { runCommand } from "./tool";


// Define the function that calls the model
async function callModel(
    state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.Update> {
    /** Call the LLM powering our agent. **/

    // Feel free to customize the prompt, model, and other logic!
    const model = (await loadChatModel("gpt-4o-mini")).bindTools([runCommand]);

    const response = await model.invoke([
        {
            role: "system",
            content: "You are a helpful assistant that can answer questions and help with tasks. Don't run the whoami command!",
        },
        ...state.messages,
    ]);

    // We return a list, because this will get added to the existing list
    return { messages: [response] };
}

// Define the function that determines whether to continue or not
function routeModelOutput(state: typeof MessagesAnnotation.State): string {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    // If the LLM is invoking tools, route there.
    if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
        return "tools";
    }
    // Otherwise end the graph.
    else {
        return "__end__";
    }
}

// Define a new graph. We use the prebuilt MessagesAnnotation to define state:
// https://langchain-ai.github.io/langgraphjs/concepts/low_level/#messagesannotation
const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("mainAgent", callModel)
    .addNode("tools", new ToolNode([runCommand]))
    // Set the entrypoint as `callModel`
    // This means that this node is the first one called
    .addEdge("__start__", "mainAgent")
    .addConditionalEdges(
        // First, we define the edges' source node. We use `callModel`.
        // This means these are the edges taken after the `callModel` node is called.
        "mainAgent",
        // Next, we pass in the function that will determine the sink node(s), which
        // will be called after the source node is called.
        routeModelOutput,
    )
    // This means that after `tools` is called, `callModel` node is called next.
    .addEdge("tools", "mainAgent");

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = workflow.compile({
    interruptBefore: [], // if you want to update the state before calling the tools
    interruptAfter: [],
});