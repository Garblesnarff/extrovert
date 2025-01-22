from typing import Dict, List, Optional
import os
import json
import requests
from crewai.tools import BaseTool

class DualSearchTool(BaseTool):
    """Enhanced search tool using SerperDev API"""

    def __init__(self):
        # Initialize with SerperDev API key from environment
        self.api_key = os.getenv('SERPER_API_KEY')
        if not self.api_key:
            raise ValueError("SERPER_API_KEY environment variable is required")

        self.serper_api_url = "https://api.serper.dev/search"

    @property
    def name(self) -> str:
        return "dual_search_tool"

    @property
    def description(self) -> str:
        return "An enhanced search tool that searches the web for current information"

    def _run(self, query: str, *args, **kwargs) -> str:
        """Execute search and return results"""
        print(f"[DualSearchTool] Starting search for query: {query}")
        try:
            # Direct SerperDev API call
            serper_results = self._search_serper(query)
            if serper_results:
                return self._format_serper_results(serper_results)
            return "No results found from search provider."
        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(f"[DualSearchTool] {error_msg}")
            return error_msg

    def _search_serper(self, query: str) -> dict:
        """Direct call to SerperDev API"""
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }
        payload = {
            'q': query,
            'num': 10
        }
        response = requests.post(self.serper_api_url, headers=headers, json=payload)
        if response.status_code == 200:
            return response.json()
        return None

    def _format_serper_results(self, results: dict) -> str:
        """Format SerperDev results into readable text"""
        if not results or 'organic' not in results:
            return "No results found"

        formatted = ["=== Latest Search Results ===\n"]
        for result in results['organic'][:5]:
            formatted.extend([
                f"Title: {result.get('title', 'No Title')}",
                f"Link: {result.get('link', 'No Link')}",
                f"Snippet: {result.get('snippet', 'No Snippet')}",
                f"Date: {result.get('date', 'No Date')}\n"
            ])
        return "\n".join(formatted)