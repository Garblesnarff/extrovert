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
        print("Starting research crew execution...")
        
        if not content or 'text' not in content:
            raise ValueError("Content must include 'text' field")

        query_text = content['text'].strip()
        print(f"Starting research with query: {query_text[:100]}...")
        
        # Initialize the research crew
        crew_instance = ResearchCrew()
        
        # Create agents with specific tasks
        fact_checker = crew_instance.fact_checker()
        context_researcher = crew_instance.context_researcher()
        content_enhancer = crew_instance.content_enhancer()
        
        # Configure tasks with the query context
        verify_facts = crew_instance.verify_facts()
        verify_facts.agent = fact_checker
        verify_facts.context = {"query": query_text}
        
        research_context = crew_instance.research_context()
        research_context.agent = context_researcher
        research_context.context = {"query": query_text, "verified_facts": "{verified_facts}"}
        
        enhance_content = crew_instance.enhance_content()
        enhance_content.agent = content_enhancer
        enhance_content.context = {
            "query": query_text,
            "verified_facts": "{verified_facts}",
            "context": "{context_research}"
        }

        # Check for required environment variables
        required_vars = ["SERPER_API_KEY", "BRAVE_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )
            
        print("All required API keys are present")

        # Initialize and execute the crew with configured tasks
        print("Initializing research crew with configured tasks...")
        crew = crew_instance.crew()
        
        print("Starting research process with proper task chain...")
        try:
            result = crew.kickoff(
                inputs={
                    'query': query_text,
                    'max_retries': 3,
                    'timeout': 60,
                    'tasks': {
                        'verify_facts': verify_facts,
                        'research_context': research_context,
                        'enhance_content': enhance_content
                    }
                }
            )
            print("Research completed successfully")
            
            # Parse and validate the result
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except json.JSONDecodeError:
                    result = {"error": "Invalid result format"}
            
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
            # If result is already parsed JSON, use it directly
            result_data = result if isinstance(result, dict) else json.loads(result)
            
            # Extract verified facts and research insights
            verified_facts = result_data.get('verify_facts', {})
            research_context = result_data.get('research_context', {})
            enhanced_content = result_data.get('enhance_content', {})
            
            # Format output with structured data
            output = {
                "topics": verified_facts.get('topics', [])[:5],  # Top 5 verified topics
                "insights": research_context.get('insights', ''),
                "enhanced_content": enhanced_content.get('suggestions', ''),
                "sources": verified_facts.get('sources', []),
                "metadata": {
                    "confidence_score": verified_facts.get('confidence_score', 0),
                    "execution_time": result_data.get('execution_time', 0)
                }
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
