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
    if not content or 'text' not in content:
        raise ValueError("Content must include 'text' field")

    query_text = content['text'].strip()
    print(f"Starting research with query: {query_text[:100]}...")
    
    # Check for required environment variables
    required_vars = ["SERPER_API_KEY", "BRAVE_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )
    
    try:
        # Initialize the research crew
        crew_instance = ResearchCrew()
        
        # Initialize and verify search tool
        search_tool = crew_instance.search_tool
        if not search_tool:
            raise ValueError("Failed to initialize search tool")
        
        # Perform initial search with error handling
        print(f"Performing initial search for query: {query_text}")
        search_results = search_tool._run(query_text)
        if not search_results:
            raise ValueError("No search results returned")
        
        print("Search completed, parsing results...")
        
        # Parse search results with detailed error handling
        try:
            search_data = json.loads(search_results)
            results_count = len(search_data.get('results', []))
            print(f"Found {results_count} search results")
            if results_count == 0:
                print("Warning: No results found in search data")
        except json.JSONDecodeError as e:
            print(f"Failed to parse search results: {str(e)}")
            search_data = {"results": [], "error": "Failed to parse search results"}
        except Exception as e:
            print(f"Unexpected error processing search results: {str(e)}")
            search_data = {"results": [], "error": str(e)}
        
        # Create and configure agents
        fact_checker = crew_instance.fact_checker()
        context_researcher = crew_instance.context_researcher()
        content_enhancer = crew_instance.content_enhancer()
        
        # Initialize tasks
        verify_facts = Task(
            description=crew_instance.tasks_config["verify_facts"]["description"],
            agent=fact_checker,
            context={
                "query": query_text,
                "search_data": search_data
            }
        )
        
        research_context = Task(
            description=crew_instance.tasks_config["research_context"]["description"],
            agent=context_researcher,
            context={
                "query": query_text,
                "search_data": search_data
            }
        )
        
        enhance_content = Task(
            description=crew_instance.tasks_config["enhance_content"]["description"],
            agent=content_enhancer,
            context={
                "query": query_text,
                "search_data": search_data
            }
        )

        # Initialize and execute the crew
        print("Initializing research crew...")
        crew = Crew(
            agents=[fact_checker, context_researcher, content_enhancer],
            tasks=[verify_facts, research_context, enhance_content],
            verbose=True
        )
        
        print("Starting research process...")
        result = crew.kickoff()
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
