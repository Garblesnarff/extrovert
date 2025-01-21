from typing import Dict, List, Optional
import os
from crewai_tools import SerperDevTool, BraveSearchTool

class DualSearchTool(SerperDevTool):
    """Enhanced search tool using SerperDev with BraveSearch as fallback"""

    def __init__(self):
        super().__init__(n_results=10)  # Increased results for better coverage
        self.brave_search = BraveSearchTool()

    def name(self) -> str:
        return "dual_search_tool"

    def description(self) -> str:
        return "An enhanced search tool that combines SerperDev and BraveSearch for comprehensive results"

    def _run(self, query: str, *args, **kwargs) -> str:
        """Execute search with both providers and combine results"""
        combined_results = []

        try:
            # Try SerperDev search first
            serper_results = super()._run(query, *args, **kwargs)
            if serper_results:
                combined_results.append("=== SerperDev Results ===\n")
                combined_results.append(serper_results)

            # Get Brave search results as backup
            try:
                brave_results = self.brave_search._run(query, *args, **kwargs)
                if brave_results:
                    combined_results.append("\n\n=== Brave Search Results ===\n")
                    combined_results.append(brave_results)
            except Exception as brave_error:
                print(f"Brave search error (non-critical): {str(brave_error)}")

            # Return combined results if we have any
            if combined_results:
                return "\n".join(combined_results)
            else:
                return "No results found from either search provider."

        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(error_msg)

            # Try Brave search as fallback
            try:
                brave_results = self.brave_search._run(query, *args, **kwargs)
                if brave_results:
                    return f"SerperDev failed but found Brave results:\n{brave_results}"
            except:
                pass

            return error_msg