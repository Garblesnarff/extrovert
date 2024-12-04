#!/usr/bin/env python
from typing import Dict
import os
import sys
import json
from crewai import Agent, Crew, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import WebsiteSearchTool
from tools.search_tools import DualSearchTool

class ResearchCrew(CrewBase):
    """Research crew for validating and enhancing Twitter content"""

    def __init__(self):
        super().__init__()
        # Initialize tools
        self.search_tool = DualSearchTool()
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
        # Initialize logging
        print("Starting research crew execution...")
        
        if not content or 'text' not in content:
            raise ValueError("Content must include 'text' field")
            
        # Validate environment
        required_vars = ["SERPER_API_KEY", "BRAVE_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(f"Missing required API keys: {', '.join(missing_vars)}")

        print(f"Starting research with content: {content['text'][:100]}...")

        # Check for required environment variables
        required_vars = ["SERPER_API_KEY", "BRAVE_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )
            
        print("All required API keys are present")

        # Initialize CrewAI components
        crew_instance = ResearchCrew()
        
        # Create specific research tasks with proper configurations
        verify_task = crew_instance.verify_facts()
        verify_task.add_context({'query': content['text']})
        verify_task.set_expected_output('Detailed fact verification report')
        
        research_task = crew_instance.research_context()
        research_task.add_context({'query': content['text']})
        research_task.set_expected_output('Comprehensive context analysis')
        
        enhance_task = crew_instance.enhance_content()
        enhance_task.add_context({'query': content['text']})
        enhance_task.set_expected_output('Enhanced content suggestions')

        # Initialize and run the crew with configured tasks
        print("Initializing research crew with configured tasks...")
        crew = crew_instance.crew()
        
        print("Starting research process with proper task chain...")
        try:
            result = crew.kickoff(
                inputs={
                    'query': content['text'],
                    'max_retries': 3,
                    'timeout': 60
                }
            )
            print("Research completed successfully")
            return result
        except Exception as task_error:
            print(f"Error during task execution: {str(task_error)}")
            raise

    except Exception as e:
        print(f"Error in research process: {str(e)}", file=sys.stderr)
        raise Exception(f"Error running research crew: {str(e)}")

if __name__ == "__main__":
    import sys
    import json

    try:
        # Get content from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No content provided")
            
        content = json.loads(sys.argv[1])
        result = run(content)
        
        # Process and format the research results
        try:
            result_data = json.loads(result)
            topics = [item['title'] for item in result_data.get('results', [])]
            insights = "\n".join([
                f"- {item['snippet']}" 
                for item in result_data.get('results', [])
                if item['snippet']
            ])
            
            # Format output with structured data
            output = {
                "topics": topics[:5],  # Top 5 relevant topics
                "insights": insights,
                "enhanced_content": result,
                "sources": [
                    {"title": item['title'], "url": item['url']}
                    for item in result_data.get('results', [])
                ]
            }
        except json.JSONDecodeError:
            # Fallback for non-JSON results
            output = {
                "topics": [],
                "insights": str(result),
                "enhanced_content": str(result)
            }
        print(json.dumps(output))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": "Invalid JSON input",
            "details": str(e)
        }))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "details": "Error processing research request"
        }))
