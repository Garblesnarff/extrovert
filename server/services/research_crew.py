from typing import Dict, List, Optional
from datetime import datetime
import os
from pydantic import BaseModel
from crewai import Agent, Task, Crew, Process, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import SerperDevTool, WebsiteSearchTool

class ResearchResult(BaseModel):
    """Structure for research findings"""
    facts: List[Dict[str, str]]
    sources: List[str]
    confidence_score: float
    context: str
    enhancement_suggestions: List[str]

class TwitterResearchCrew(CrewBase):
    """Research crew for validating and enhancing Twitter content"""
    
    def __init__(self):
        super().__init__()
        # Initialize tools
        self.search_tool = SerperDevTool()
        self.web_tool = WebsiteSearchTool()
        
        # Initialize LLMs following best practices
        self.gemini_config = {
            "model": "gemini-1.5-pro",
            "api_key": os.getenv("GEMINI_API_KEY")
        }
        
        self.groq_config = {
            "model": "llama3-70b-8192",
            "base_url": "https://api.groq.com/v1",
            "api_key": os.getenv("GROQ_API_KEY")
        }

    @agent
    def fact_checker(self) -> Agent:
        return Agent(
            role="Research Validator & Fact Checker",
            goal="Thoroughly verify claims and gather supporting evidence",
            backstory="""You are a meticulous fact-checker with expertise in 
            research and verification. You excel at finding and validating 
            information from reliable sources.""",
            tools=[self.search_tool, self.web_tool],
            llm=LLM(config=self.gemini_config),
            verbose=True
        )

    @agent
    def context_researcher(self) -> Agent:
        return Agent(
            role="Context & Background Researcher",
            goal="Provide comprehensive context and background information",
            backstory="""You are an expert at synthesizing relevant background 
            information and context to create a complete picture.""",
            tools=[self.search_tool, self.web_tool],
            llm=LLM(config=self.groq_config),
            verbose=True
        )

    @task
    def verify_facts(self) -> Task:
        return Task(
            description="""Verify all claims in the provided content:
            1. Find primary sources
            2. Cross-reference with reliable sources
            3. Note any discrepancies
            4. Provide confidence score
            5. List all sources""",
            agent=self.fact_checker()
        )

    @task
    def research_context(self) -> Task:
        return Task(
            description="""Research broader context:
            1. Find relevant background
            2. Identify related trends
            3. Find recent developments
            4. Gather statistics
            5. Collect expert opinions""",
            agent=self.context_researcher(),
            context=[self.verify_facts()]
        )

    @crew
    def research_crew(self) -> Crew:
        return Crew(
            agents=[
                self.fact_checker(),
                self.context_researcher()
            ],
            tasks=[
                self.verify_facts(),
                self.research_context()
            ],
            process=Process.sequential,
            verbose=True
        )

def process_research(content: str) -> ResearchResult:
    """Process content through the research crew"""
    try:
        research_crew = TwitterResearchCrew()
        results = research_crew.research_crew().kickoff(inputs={"content": content})

        # Extract facts from verification task
        facts = []
        if results.tasks[0].output:
            facts = [
                {
                    "statement": fact.get("statement", ""),
                    "source": fact.get("source", ""),
                    "confidence": fact.get("confidence", 0.0)
                }
                for fact in results.tasks[0].output.get("verified_facts", [])
            ]

        return ResearchResult(
            facts=facts,
            sources=results.tasks[0].output.get("sources", []),
            confidence_score=results.tasks[0].output.get("average_confidence", 0.0),
            context=results.tasks[1].output.get("context", ""),
            enhancement_suggestions=[]
        )

    except Exception as e:
        raise Exception(f"Research crew error: {str(e)}")

if __name__ == "__main__":
    import sys
    import json
    
    try:
        # Read input from command line
        input_data = json.loads(sys.argv[1])
        content = input_data.get("content", "")
        
        # Process the research
        result = process_research(content)
        
        # Output the result as JSON
        print(json.dumps(result.dict()))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "facts": [],
            "sources": [],
            "confidence_score": 0.0,
            "context": "",
            "enhancement_suggestions": []
        }))
