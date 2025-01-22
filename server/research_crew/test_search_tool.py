import os
from tools.search_tools import DualSearchTool  # Import your DualSearchTool

def test_dual_search_tool():
    try:
        print("[Test Script] Creating DualSearchTool instance...")
        search_tool = DualSearchTool()
        print("[Test Script] DualSearchTool instance created.")
        print("[Test Script] API Key from __init__:", search_tool.api_key) # Check key *after* init

        test_query = "What is the weather in Paris?"
        print(f"[Test Script] Running _run method with query: '{test_query}'...")
        results = search_tool._run(test_query)
        print("[Test Script] _run method completed.")

        print("\n[Test Script] Search Results:\n")
        print(results)

    except Exception as e:
        print(f"[Test Script] Error during test: {e}")

if __name__ == "__main__":
    test_dual_search_tool()