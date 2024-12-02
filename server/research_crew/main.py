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
        query = content['text']
        
        try:
            # Perform the search with proper parameters
            search_results = research_crew.search_tool.search({
                "q": query,
                "gl": "us",
                "hl": "en",
                "autocorrect": True,
                "time": "d",
                "num": 5
            })
            
            print(f"Search results: {json.dumps(search_results, indent=2)}")
            
            if not search_results or not search_results.get('organic'):
                return {"insights": "No search results found for the query"}
                
            # Extract and format relevant information
            results = search_results['organic']
            insights = []
            
            for result in results:
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                link = result.get('link', '')
                date = result.get('date', '')
                
                if title and snippet:
                    formatted_result = f"• {title}\n"
                    if date:
                        formatted_result += f"Date: {date}\n"
                    formatted_result += f"{snippet}\n"
                    if link:
                        formatted_result += f"Source: {link}\n"
                    insights.append(formatted_result)
            
            if not insights:
                return {"insights": "No relevant information found for the query"}
                
            formatted_insights = "\n\n".join(insights)
            return {"insights": formatted_insights}
            
        except Exception as search_error:
            print(f"Search error: {str(search_error)}")
            return {"insights": f"Search failed: {str(search_error)}"}
            
    except Exception as e:
        print(f"Research crew error: {str(e)}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python main.py '<content_json>'")
        sys.exit(1)
        
    try:
        content = json.loads(sys.argv[1])
        result = run(content)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    except Exception as e:
        print(json.dumps({"error": f"Execution error: {str(e)}"}))