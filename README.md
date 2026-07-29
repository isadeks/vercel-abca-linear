# vercel-abca-linear

## From the agent harness research paper

The following section is quoted from Anthropic's agent-harness research write-up
["Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents):

> ### What are agents?
>
> "Agent" can be defined in several ways. Some customers define agents as fully
> autonomous systems that operate independently over extended periods, using
> various tools to accomplish complex tasks. Others use the term to describe more
> prescriptive implementations that follow predefined workflows. At Anthropic, we
> categorize all these variations as **agentic systems**, but draw an important
> architectural distinction between **workflows** and **agents**:
>
> - **Workflows** are systems where LLMs and tools are orchestrated through
>   predefined code paths.
> - **Agents**, on the other hand, are systems where LLMs dynamically direct their
>   own processes and tool usage, maintaining control over how they accomplish
>   tasks.
