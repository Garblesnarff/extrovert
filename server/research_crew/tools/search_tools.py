from typing import Dict, List, Optional
from crewai_tools import BaseTool
import os
import aiohttp
import json
import asyncio

class DualSearchTool(BaseTool):
    """A tool that combines results from both Serper and Brave search APIs"""
    
    def __init__(self):
        self.brave_api_key = os.getenv('BRAVE_API_KEY')
        self.serper_api_key = os.getenv('SERPER_API_KEY')

    def name(self) -> str:
        return "dual_search_tool"

    def description(self) -> str:
        return "A powerful search tool that combines results from multiple search engines for comprehensive real-time information"

    async def _fetch_brave_results(self, session: aiohttp.ClientSession, query: str) -> dict:
        """Fetch results from Brave Search API"""
        try:
            headers = {
                'X-Subscription-Token': self.brave_api_key,
                'Accept': 'application/json',
            }
            params = {
                'q': query,
                'count': 5,
                'freshness': '1d'
            }
            
            async with session.get(
                'https://api.search.brave.com/res/v1/web/search',
                headers=headers,
                params=params,
                timeout=5.0
            ) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            print(f"Error fetching Brave results: {str(e)}")
            return {"web": {"results": []}}

    async def _fetch_serper_results(self, session: aiohttp.ClientSession, query: str) -> dict:
        """Fetch results from Serper API"""
        try:
            headers = {
                'X-API-KEY': self.serper_api_key,
                'Content-Type': 'application/json'
            }
            data = {
                'q': query,
                'gl': 'us',
                'hl': 'en',
                'autocorrect': True,
                'type': 'search'
            }
            
            async with session.post(
                'https://google.serper.dev/search',
                headers=headers,
                json=data,
                timeout=5.0
            ) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            print(f"Error fetching Serper results: {str(e)}")
            return {"organic": []}

    async def _arun(self, query: str, *args, **kwargs) -> str:
        """Execute search across multiple providers"""
        try:
            async with aiohttp.ClientSession() as session:
                # Run both searches concurrently with timeout
                tasks = [
                    asyncio.create_task(self._fetch_brave_results(session, query)),
                    asyncio.create_task(self._fetch_serper_results(session, query))
                ]
                
                done, pending = await asyncio.wait(
                    tasks,
                    timeout=10.0,
                    return_when=asyncio.ALL_COMPLETED
                )
                
                # Cancel any pending tasks
                for task in pending:
                    task.cancel()
                
                # Process results
                combined_results = []
                
                for task in done:
                    try:
                        result = await task
                        if isinstance(result, dict):
                            if 'web' in result:  # Brave results
                                for item in result['web'].get('results', [])[:5]:
                                    combined_results.append({
                                        'title': item.get('title', ''),
                                        'link': item.get('url', ''),
                                        'snippet': item.get('description', ''),
                                        'source': 'Brave',
                                        'timestamp': item.get('age', '')
                                    })
                            elif 'organic' in result:  # Serper results
                                for item in result['organic'][:5]:
                                    combined_results.append({
                                        'title': item.get('title', ''),
                                        'link': item.get('link', ''),
                                        'snippet': item.get('snippet', ''),
                                        'source': 'Serper',
                                        'timestamp': item.get('date', '')
                                    })
                    except Exception as e:
                        print(f"Error processing search results: {str(e)}")
                        continue
                
                # Sort results by relevance and recency
                combined_results.sort(
                    key=lambda x: (bool(x['timestamp']), x['timestamp'] if x['timestamp'] else ''),
                    reverse=True
                )
                
                # Format results as a detailed string with metadata
                formatted_results = f"Search Results for: {query}\n\n"
                formatted_results += f"Total Results: {len(combined_results)}\n"
                formatted_results += "Sources: Brave Search, Serper\n\n"
                
                for idx, result in enumerate(combined_results, 1):
                    formatted_results += f"{idx}. [{result['source']}] {result['title']}\n"
                    formatted_results += f"   URL: {result['link']}\n"
                    if result['timestamp']:
                        formatted_results += f"   Time: {result['timestamp']}\n"
                    formatted_results += f"   {result['snippet']}\n\n"
                
                return formatted_results
                
        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(error_msg)
            return error_msg

    def _run(self, query: str, *args, **kwargs) -> str:
        """Synchronous wrapper for async execution"""
        return asyncio.run(self._arun(query, *args, **kwargs))
