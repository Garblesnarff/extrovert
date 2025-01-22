
#!/usr/bin/env python
from typing import Dict
import os
import sys
import json
from crewai import Agent, Crew, Task
from tools.search_tools import DualSearchTool

class ResearchCrew:
    """Research crew for validating and enhancing Twitter content"""

    def __init__(self):
        # Initialize tools
        self.search_tool = DualSearchTool()
        self.web_tool = WebsiteSearchTool()
        
        # Load config files
        self.agents_config = self._load_config('agents.yaml')
        self.tasks_config = self._load_config('tasks.yaml')
        
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
            config=self.agents_config["fact_checker"],
            tools=[self.search_tool, self.web_tool]
        )
        self.context_researcher = Agent(
            config=self.agents_config["context_researcher"],
            tools=[self.search_tool, self.web_tool]
        )
        self.content_enhancer = Agent(
            config=self.agents_config["content_enhancer"],
            tools=[self.web_tool]
        )
        self.agents = [self.fact_checker, self.context_researcher, self.content_enhancer]
        
    def _setup_tasks(self):
        self.verify_facts = Task(
            config=self.tasks_config["verify_facts"]
        )
        self.research_context = Task(
            config=self.tasks_config["research_context"]
        )
        self.enhance_content = Task(
            config=self.tasks_config["enhance_content"]
        )
        self.tasks = [self.verify_facts, self.research_context, self.enhance_content]

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
        print("[ResearchCrew] Run function started")
        if not content or 'text' not in content:
            raise ValueError("Content must include 'text' field")

        print(f"[ResearchCrew] Starting research with content: {content['text'][:100]}...")

        # Check for required environment variables
        required_vars = ["SERPER_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )
            
        print("All required API keys are present")

        # Initialize and run the crew
        print("[ResearchCrew] Initializing research crew...")
        crew = ResearchCrew().crew()
        
        print("[ResearchCrew] Crew initialized, starting kickoff")
        result = crew.kickoff(inputs={'query': content['text']})
        
        print("[ResearchCrew] Research completed successfully")
        print("[ResearchCrew] Result:", result[:200] + "..." if result else "No result")
        return result

    except Exception as e:
        print(f"Error in research process: {str(e)}", file=sys.stderr)
        raise Exception(f"Error running research crew: {str(e)}")

if __name__ == "__main__":
    import sys
    import json
    import yaml

    try:
        # Get content from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No content provided")
            
        content = json.loads(sys.argv[1])
        result = run(content)
        
        # Format output as JSON
        output = {
            "topics": [],  # Add topics if available
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
