from typing import Dict, List, Optional
import json
import sys
import os
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from crewai_tools import SerperDevTool, WebsiteSearchTool

def create_research_crew(query: str):
    """Create and configure the research crew"""
    
    # Initialize tools
    search_tool = SerperDevTool()
    web_tool = WebsiteSearchTool()
    
    # Initialize LLM configurations
    gemini = ChatGoogleGenerativeAI(
        model="gemini-1.0-pro",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        convert_system_message_to_human=True
    )
    
    groq = ChatGroq(
        model_name="mixtral-8x7b-32768",
        api_key=os.getenv("GROQ_API_KEY")
    )

    # Create agents
    fact_checker = Agent(
        role="Research Validator & Fact Checker",
        goal="Thoroughly verify claims and gather supporting evidence",
        backstory="""You are a meticulous fact-checker with expertise in research and verification. 
        You excel at finding and validating information from reliable sources.""",
        tools=[search_tool, web_tool],
        llm=gemini,
        verbose=True
    )

    context_researcher = Agent(
        role="Context & Background Researcher",
        goal="Provide comprehensive context and background information",
        backstory="""You are an expert at synthesizing relevant background information and context 
        to create a complete picture.""",
        tools=[search_tool, web_tool],
        llm=groq,
        verbose=True
    )

    # Create tasks
    verify_facts = Task(
        description=f"""Research and verify facts about: {query}
        1. Find primary sources
        2. Cross-reference with reliable sources
        3. Note any discrepancies
        4. List key findings
        5. Cite sources used""",
        agent=fact_checker
    )

    research_context = Task(
        description=f"""Research broader context about: {query}
        1. Find relevant background
        2. Identify related trends
        3. Find recent developments
        4. Gather statistics
        5. Collect expert opinions""",
        agent=context_researcher
    )

    # Create and return the crew
    return Crew(
        agents=[fact_checker, context_researcher],
        tasks=[verify_facts, research_context],
        process=Process.sequential,
        verbose=True
    )

def main():
    try:
        # Parse input
        input_data = json.loads(sys.argv[1])
        query = input_data.get("query", "").strip()
        
        if not query:
            raise ValueError("Query is required")
        
        # Create and run the crew
        crew = create_research_crew(query)
        results = crew.kickoff(inputs={"query": query})
        
        # Process results
        response = {
            "insights": results.tasks[0].output,  # Fact checking results
            "context": results.tasks[1].output if len(results.tasks) > 1 else "",  # Context results
        }
        
        # Return results
        print(json.dumps(response))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "insights": "",
            "context": ""
        }
        print(json.dumps(error_response))

if __name__ == "__main__":
    main()