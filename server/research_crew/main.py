#!/usr/bin/env python
from typing import Dict
import os
import sys
import json
import yaml
from crewai import Agent, Crew, Task
from crewai_tools import SerperDevTool

class ResearchCrew:
    """Research crew for validating and enhancing Twitter content"""

    def __init__(self):
        # Initialize SerperDevTool
        self.search_tool = SerperDevTool()

        # Load config files
        self.agents_config = self._load_config('agents.yaml')
        self.tasks_config = self._load_config('tasks.yaml')

        # Set up API configurations
        os.environ["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY", "")
        os.environ["CEREBRAS_API_KEY"] = os.getenv("CEREBRAS_API_KEY", "")

        # Initialize components
        self.agents = []
        self.tasks = []
        self._setup_agents()
        self._setup_tasks()

    def _load_config(self, filename):
        config_path = os.path.join(os.path.dirname(__file__), 'config', filename)
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def _setup_agents(self):
        self.fact_checker = Agent(
            role=self.agents_config["fact_checker"]["role"],
            goal=self.agents_config["fact_checker"]["goal"],
            backstory=self.agents_config["fact_checker"]["backstory"],
            tools=[self.search_tool],
            llm="gemini/gemini-2.0-flash-exp",    
            verbose=True,
            max_iter=3,  # Limit retries
            max_retry_limit=3
        )
        self.context_researcher = Agent(
            role=self.agents_config["context_researcher"]["role"],
            goal=self.agents_config["context_researcher"]["goal"],
            backstory=self.agents_config["context_researcher"]["backstory"],
            tools=[self.search_tool],
            llm="gemini/gemini-2.0-flash-exp",
            verbose=True,
            max_iter=3,  # Limit retries
            max_retry_limit=3
        )
        self.content_enhancer = Agent(
            role=self.agents_config["content_enhancer"]["role"],
            goal=self.agents_config["content_enhancer"]["goal"],
            backstory=self.agents_config["content_enhancer"]["backstory"],
            tools=[self.search_tool],
            llm="gemini/gemini-2.0-flash-exp",
            verbose=True,
            max_iter=3,  # Limit retries
            max_retry_limit=3
        )
        self.agents = [self.fact_checker, self.context_researcher, self.content_enhancer]

    def _setup_tasks(self):
        self.verify_facts = Task(
            description=self.tasks_config["verify_facts"]["description"],
            expected_output=self.tasks_config["verify_facts"]["expected_output"],
            agent=self.fact_checker
        )
        self.research_context = Task(
            description=self.tasks_config["research_context"]["description"],
            expected_output=self.tasks_config["research_context"]["expected_output"],
            agent=self.context_researcher
        )
        self.enhance_content = Task(
            description=self.tasks_config["enhance_content"]["description"],
            expected_output=self.tasks_config["enhance_content"]["expected_output"],
            agent=self.content_enhancer
        )
        self.tasks = [self.verify_facts, self.research_context, self.enhance_content]

    def crew(self) -> Crew:
        """Assembles the research crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )

def run(content: Dict = None) -> Dict:
    """Run the crew with the provided content"""
    try:
        print("[ResearchCrew] Run function started")
        if not content or 'text' not in content:
            raise ValueError("Content must include 'text' field")

        print(f"[ResearchCrew] Starting research with content: {content['text'][:100]}...")

        # Check for required environment variables
        required_vars = ["SERPER_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

        print("All required API keys are present")

        # Initialize and run the crew
        print("[ResearchCrew] Initializing research crew...")
        crew = ResearchCrew().crew()
        print("[ResearchCrew] Research crew initialized.")    

        # Execute the crew
        result = crew.kickoff(inputs={'query': content['text']})
        print("[ResearchCrew] Research completed successfully")

        # Format the result
        result_text = result.raw if hasattr(result, 'raw') else str(result)
        formatted_result = {
            "topics": [],
            "insights": result_text,
            "enhanced_content": result_text
        }

        # Only print the JSON result at the end
        print(json.dumps(formatted_result))
        return formatted_result

    except Exception as e:
        error_message = f"Error running research crew: {str(e)}"
        print(json.dumps({
            "error": error_message,
            "details": "Error processing research request"
        }))
        raise Exception(error_message)

if __name__ == "__main__":
    try:
        # Get content from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No content provided")

        content = json.loads(sys.argv[1])
        result = run(content)

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