---
'@mastra/mcp': patch
---

Fixed `MCPServer` turning a tool whose `execute` returns `undefined` into an invalid `tools/call` result: the result now serialises as `null` instead of producing a protocol error after the tool already ran, matching the agent-loop behavior from #27392.
