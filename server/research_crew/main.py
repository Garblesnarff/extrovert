#!/usr/bin/env python
from typing import Dict
import os
import json
from datetime import datetime, timedelta
from crewai import Agent, Crew, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import SerperDevTool

class ResearchCrew(CrewBase):
    def __init__(self):
        super().__init__()
        api_key = os.getenv("SERPER_API_KEY")
        if not api_key:
            raise EnvironmentError("SERPER_API_KEY environment variable is required")
            
        self.search_tool = SerperDevTool(
            api_key=api_key,
            n_results=10,
            search_url="https://google.serper.dev/search",
            params={
                "gl": "us",
                "hl": "en",
                "autocorrect": True,
                "time": "d",  # Last 24 hours
                "type": "search"
            }
        )
        print("Initialized SerperDev search tool with parameters")

    @agent
    def fact_checker(self) -> Agent:
        return Agent(
            config=self.agents_config["fact_checker"],
            tools=[self.search_tool],
            llm_config={
                "temperature": 0.5,
                "timeout": 120,
                "max_tokens": 2000
            }
        )

    @agent
    def context_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["context_researcher"],
            tools=[self.search_tool],
            llm_config={
                "temperature": 0.7,
                "timeout": 120,
                "max_tokens": 2000
            }
        )

    @agent
    def content_enhancer(self) -> Agent:
        return Agent(
            config=self.agents_config["content_enhancer"],
            tools=[self.search_tool],
            llm_config={
                "temperature": 0.6,
                "timeout": 120,
                "max_tokens": 2000
            }
        )

    @task
    def verify_facts(self) -> Task:
        return Task(
            config=self.tasks_config["verify_facts"]
        )

    @task
    def research_context(self) -> Task:
        return Task(
            config=self.tasks_config["research_context"]
        )

    @task
    def enhance_content(self) -> Task:
        return Task(
            config=self.tasks_config["enhance_content"]
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True
        )

def run(content: Dict = None):
    if not content or not content.get('text'):
        raise ValueError("Content text is required")

    try:
        research_crew = ResearchCrew()
        crew = research_crew.crew()
        
        print(f"Starting research process for query: {content['text']}")
        
        # Configure search parameters
        search_config = {
            'query': content['text'],
            'search_params': {
                'time_range': 'last_24h',
                'include_news': True,
                'sort_by': 'date',
                'num_results': 10
            }
        }
        
        # Execute research with configured parameters
        result = crew.kickoff(inputs=search_config)
        
        # Format and validate results
        if isinstance(result, str):
            try:
                parsed_result = json.loads(result)
                return parsed_result
            except json.JSONDecodeError:
                return {"insights": result}
        
        return result
    except Exception as e:
        print(f"Research error: {str(e)}")
        raise

if __name__ == "__main__":
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_content = {
        "text": f"What are the latest developments in AI as of {current_time}?"
    }

    try:
        result = run(test_content)
        print(f"Research Results (as of {current_time}):", result)
    except Exception as e:
        print(f"Error: {str(e)}")