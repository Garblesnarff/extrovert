from typing import Dict, List, Optional
import os
import json
from crewai_tools import SerperDevTool, BraveSearchTool

class DualSearchTool(SerperDevTool):
    """Enhanced search tool using SerperDev with BraveSearch as fallback"""

    def __init__(self):
        # Initialize with SerperDev API key from environment
        api_key = os.getenv('SERPER_API_KEY')
        if not api_key:
            raise ValueError("SERPER_API_KEY environment variable is required")

        super().__init__(
            api_key=api_key,  # Explicitly pass API key
            n_results=10  # Increased results for better coverage
        )
        self.brave_search = BraveSearchTool()

    def name(self) -> str:
        return "dual_search_tool"

    def description(self) -> str:
        return "An enhanced search tool that combines SerperDev and BraveSearch for comprehensive results"

    def _run(self, query: str, *args, **kwargs) -> str:
        """Execute search with both providers and combine results"""
        print(f"[DualSearchTool] Executing search for query: {query}")
        combined_results = []

        try:
            # Try SerperDev search first
            print("[DualSearchTool] Attempting SerperDev search...")
            serper_results = super()._run(query, *args, **kwargs)

            if serper_results:
                print("[DualSearchTool] SerperDev results received")
                # Format SerperDev results
                combined_results.append("=== Latest Search Results ===\n")

                # Try to parse JSON if results are in JSON format
                try:
                    parsed_results = json.loads(serper_results)
                    if isinstance(parsed_results, dict) and 'organic' in parsed_results:
                        for result in parsed_results['organic'][:5]:  # Take top 5 results
                            combined_results.append(f"Title: {result.get('title', 'No Title')}")
                            combined_results.append(f"Link: {result.get('link', 'No Link')}")
                            combined_results.append(f"Snippet: {result.get('snippet', 'No Snippet')}\n")
                    else:
                        combined_results.append(serper_results)
                except json.JSONDecodeError:
                    # If not JSON, add as plain text
                    combined_results.append(serper_results)

            # Get Brave search results as backup
            try:
                print("[DualSearchTool] Attempting Brave search as backup...")
                brave_results = self.brave_search._run(query, *args, **kwargs)
                if brave_results:
                    combined_results.append("\n\n=== Additional Search Results ===\n")
                    combined_results.append(brave_results)
            except Exception as brave_error:
                print(f"[DualSearchTool] Brave search error (non-critical): {str(brave_error)}")

            # Return combined results if we have any
            if combined_results:
                final_results = "\n".join(combined_results)
                print("[DualSearchTool] Search completed successfully")
                return final_results
            else:
                print("[DualSearchTool] No results found from either provider")
                return "No results found from either search provider."

        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(f"[DualSearchTool] {error_msg}")

            # Try Brave search as fallback
            try:
                brave_results = self.brave_search._run(query, *args, **kwargs)
                if brave_results:
                    return f"SerperDev failed but found Brave results:\n{brave_results}"
            except:
                pass

            return error_msg