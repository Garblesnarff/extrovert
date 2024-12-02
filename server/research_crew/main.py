#!/usr/bin/env python
from typing import Dict
import os
from crewai import Agent, Crew, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import SerperDevTool, WebsiteSearchTool

class ResearchCrew(CrewBase):
    """Research crew for validating and enhancing Twitter content"""

    def __init__(self):
        super().__init__()
        # Initialize tools
        self.search_tool = SerperDevTool()
        self.web_tool = WebsiteSearchTool()

    @agent
    def fact_checker(self) -> Agent:
        """Creates the fact checking agent"""
        return Agent(
            config=self.agents_config["fact_checker"],
            tools=[self.search_tool, self.web_tool]
        )

    @agent
    def context_researcher(self) -> Agent:
        """Creates the context research agent"""
        return Agent(
            config=self.agents_config["context_researcher"],
            tools=[self.search_tool, self.web_tool]
        )

    @agent
    def content_enhancer(self) -> Agent:
        """Creates the content enhancement agent"""
        return Agent(
            config=self.agents_config["content_enhancer"],
            tools=[self.web_tool]
        )

    @task
    def verify_facts(self) -> Task:
        """Task for fact verification"""
        return Task(
            config=self.tasks_config["verify_facts"]
        )

    @task
    def research_context(self) -> Task:
        """Task for context research"""
        return Task(
            config=self.tasks_config["research_context"]
        )

    @task
    def enhance_content(self) -> Task:
        """Task for content enhancement"""
        return Task(
            config=self.tasks_config["enhance_content"]
        )

    @crew
    def crew(self) -> Crew:
        """Assembles the research crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True
        )

def run(content: Dict = None):
    """Run the crew with the provided content"""
    try:
        # Check for required environment variables
        required_vars = ["GEMINI_API_KEY", "GROQ_API_KEY", "SERPER_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

        # Initialize and run the crew
        crew = ResearchCrew().crew()
        result = crew.kickoff(inputs=content)
        return result

    except Exception as e:
        raise Exception(f"Error running research crew: {str(e)}")

if __name__ == "__main__":
    # Example usage
    content = {
        "text": """AI has reduced software development time by 80% across all industries 
        in 2024, leading to a significant shift in how companies approach technical hiring."""
    }

    try:
        result = run(content)
        print("Research Results:", result)
    except Exception as e:
        print(f"Error: {str(e)}")
