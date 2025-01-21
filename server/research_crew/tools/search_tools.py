from typing import Dict, List, Optional
import os
import json
import requests
from crewai_tools import BraveSearchTool

class DualSearchTool:
    """Enhanced search tool using SerperDev with BraveSearch as fallback"""

    def __init__(self):
        # Initialize with SerperDev API key from environment
        self.api_key = os.getenv('SERPER_API_KEY')
        if not self.api_key:
            raise ValueError("SERPER_API_KEY environment variable is required")

        self.brave_search = BraveSearchTool()
        self.serper_api_url = "https://api.serper.dev/search"

    def name(self) -> str:
        return "dual_search_tool"

    def description(self) -> str:
        return "An enhanced search tool that combines SerperDev and BraveSearch for comprehensive results"

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

        print(f"[DualSearchTool] Calling SerperDev API with query: {query}")
        response = requests.post(self.serper_api_url, headers=headers, json=payload)
        print(f"[DualSearchTool] SerperDev API Status: {response.status_code}")

        if response.status_code == 200:
            return response.json()
        else:
            print(f"[DualSearchTool] SerperDev API Error: {response.text}")
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

    def _run(self, query: str, *args, **kwargs) -> str:
        """Execute search with both providers and combine results"""
        print(f"[DualSearchTool] Starting search for query: {query}")
        combined_results = []

        try:
            # Direct SerperDev API call
            serper_results = self._search_serper(query)
            if serper_results:
                formatted_results = self._format_serper_results(serper_results)
                combined_results.append(formatted_results)
                print("[DualSearchTool] Successfully got SerperDev results")

            # Get Brave search results as backup
            try:
                print("[DualSearchTool] Attempting Brave search as backup...")
                brave_results = self.brave_search._run(query, *args, **kwargs)
                if brave_results:
                    combined_results.append("\n=== Additional Search Results ===\n")
                    combined_results.append(brave_results)
            except Exception as brave_error:
                print(f"[DualSearchTool] Brave search error (non-critical): {str(brave_error)}")

            # Return combined results
            if combined_results:
                final_results = "\n".join(combined_results)
                print("[DualSearchTool] Search completed successfully")
                return final_results

            return "No results found from either search provider."

        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(f"[DualSearchTool] {error_msg}")
            return error_msg