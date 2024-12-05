from typing import Dict, List, Optional
from crewai_tools import SerperDevTool, BraveSearchTool

class DualSearchTool(SerperDevTool):
    """Enhanced search tool using SerperDev with BraveSearch as fallback"""
    
    def __init__(self):
        super().__init__(n_results=5)
        self.brave_search = BraveSearchTool()
        
    def name(self) -> str:
        return "dual_search_tool"

    def description(self) -> str:
        return "An enhanced search tool that combines SerperDev and BraveSearch for comprehensive results"

    def _run(self, query: str, *args, **kwargs) -> str:
        """Execute search with both providers and combine results"""
        try:
            # Try SerperDev search first
            serper_results = super()._run(query, *args, **kwargs)
            
            # Get Brave search results
            brave_results = self.brave_search._run(query, *args, **kwargs)
            
            # Combine and format results
            combined_results = "=== SerperDev Results ===\n"
            combined_results += serper_results if serper_results else "No SerperDev results found"
            combined_results += "\n\n=== Brave Search Results ===\n"
            combined_results += brave_results if brave_results else "No Brave results found"
            
            return combined_results
            
        except Exception as e:
            error_msg = f"Error executing dual search: {str(e)}"
            print(error_msg)
            return error_msg
