from typing import Dict, List, Optional
from crewai_tools import BaseTool
import os
import aiohttp
import json
import asyncio
import time

class DualSearchTool(BaseTool):
    """A tool that combines results from both Serper and Brave search APIs"""
    
    def __init__(self):
        self.brave_api_key = os.getenv('BRAVE_API_KEY')
        self.serper_api_key = os.getenv('SERPER_API_KEY')
        
        if not self.brave_api_key or not self.serper_api_key:
            raise ValueError("Missing required API keys: BRAVE_API_KEY and SERPER_API_KEY must be set")
            
        print("Initialized DualSearchTool with required API keys")

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
                'count': 10,
                'freshness': 'h',  # Last hour for real-time results
                'text_decorations': 'false',
                'search_lang': 'en',
                'country': 'US',
                'safesearch': 'moderate',
                'format': 'json',
                'sort_by': 'freshness'  # Prioritize recent results
            }
            
            async with session.get(
                'https://api.search.brave.com/res/v1/web/search',
                headers=headers,
                params=params,
                timeout=30.0,
                raise_for_status=True
            ) as response:
                if response.status == 429:  # Rate limit exceeded
                    print("Rate limit reached for Brave API, backing off...")
                    await asyncio.sleep(2)  # Back off for 2 seconds
                    return {"web": {"results": []}}
                return await response.json()
        except aiohttp.ClientError as e:
            print(f"Error fetching Brave results: {str(e)}")
            return {"web": {"results": []}}
        except Exception as e:
            print(f"Unexpected error in Brave search: {str(e)}")
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
                'type': 'search',
                'time': 'h',  # Last hour for real-time results
                'num': 10,
                'tbs': 'qdr:h',  # Restrict to last hour
                'sort': 'date'  # Sort by date for recent results
            }
            
            async with session.post(
                'https://google.serper.dev/search',
                headers=headers,
                json=data,
                timeout=30.0,
                raise_for_status=True
            ) as response:
                if response.status == 429:  # Rate limit exceeded
                    print("Rate limit reached for Serper API, backing off...")
                    await asyncio.sleep(2)  # Back off for 2 seconds
                    return {"organic": []}
                return await response.json()
        except aiohttp.ClientError as e:
            print(f"Error fetching Serper results: {str(e)}")
            return {"organic": []}
        except Exception as e:
            print(f"Unexpected error in Serper search: {str(e)}")
            return {"organic": []}

    async def _arun(self, query: str, *args, **kwargs) -> str:
        """Execute search across multiple providers"""
        try:
            start_time = time.time()
            # Validate and clean the query
            if not query or len(query.strip()) == 0:
                return json.dumps({
                    "error": "Empty search query",
                    "results": []
                })

            query = query.strip()
            print(f"Executing real-time dual search for query: {query}")
            
            # Verify API keys are present
            if not self.brave_api_key or not self.serper_api_key:
                return json.dumps({
                    "error": "Missing API keys",
                    "results": []
                })

            async with aiohttp.ClientSession() as session:
                # Run both searches concurrently with individual timeouts
                brave_task = asyncio.create_task(self._fetch_brave_results(session, query))
                serper_task = asyncio.create_task(self._fetch_serper_results(session, query))
                
                # Wait for both tasks with timeout
                try:
                    results = await asyncio.gather(
                        brave_task,
                        serper_task,
                        return_exceptions=True
                    )
                except asyncio.TimeoutError:
                    print("Search timeout occurred")
                    for task in [brave_task, serper_task]:
                        if not task.done():
                            task.cancel()
                    results = []
                
                # Process results from both providers
                combined_results = []
                
                for i, result in enumerate(results):
                    try:
                        if isinstance(result, Exception):
                            print(f"Search provider {i} error: {str(result)}")
                            continue
                            
                        if isinstance(result, dict):
                            if 'web' in result:  # Brave results
                                for item in result['web'].get('results', []):
                                    if isinstance(item, dict):
                                        timestamp = item.get('age', '')
                                        # Only include recent results
                                        if timestamp and ('minute' in timestamp.lower() or 'hour' in timestamp.lower()):
                                            combined_results.append({
                                                'title': item.get('title', '').strip(),
                                                'link': item.get('url', ''),
                                                'snippet': item.get('description', '').strip(),
                                                'source': 'Brave',
                                                'timestamp': timestamp,
                                                'score': len(item.get('description', '')) / 100  # Base score
                                            })
                            elif 'organic' in result:  # Serper results
                                for item in result['organic']:
                                    if isinstance(item, dict):
                                        timestamp = item.get('date', '')
                                        # Only include results with timestamps and ensure they're recent
                                        if timestamp:
                                            combined_results.append({
                                                'title': item.get('title', '').strip(),
                                                'link': item.get('link', ''),
                                                'snippet': item.get('snippet', '').strip(),
                                                'source': 'Serper',
                                                'timestamp': timestamp,
                                                'score': len(item.get('snippet', '')) / 100 + 
                                                        (50 if 'hour' in timestamp.lower() or 'minute' in timestamp.lower() else 0)  # Boost recent results
                                            })
                    except Exception as e:
                        print(f"Error processing search results: {str(e)}")
                        continue
                
                # Remove duplicate URLs and low-quality results
                seen_urls = set()
                unique_results = []
                
                for result in combined_results:
                    url = result['link']
                    # Skip if URL already seen or result has no meaningful content
                    if (url in seen_urls or 
                        not result['snippet'] or 
                        len(result['snippet'].split()) < 5):
                        continue
                        
                    seen_urls.add(url)
                    # Calculate relevance score based on content quality
                    score = 0
                    if result['snippet']:
                        # Score based on content length and keyword presence
                        words = set(query.lower().split())
                        snippet_words = set(result['snippet'].lower().split())
                        keyword_matches = len(words.intersection(snippet_words))
                        # Score based on content relevance and recency
                        base_score = (keyword_matches * 10) + (len(result['snippet'].split()) / 50)
                        
                        # Boost score for recent content
                        if result['timestamp']:
                            if 'minute' in result['timestamp'].lower() or 'hour' in result['timestamp'].lower():
                                base_score *= 1.5  # 50% boost for very recent content
                                
                        score = base_score
                        
                    result['relevance_score'] = score
                    unique_results.append(result)

                # Sort by relevance score and recency
                unique_results.sort(
                    key=lambda x: (
                        x['relevance_score'],
                        bool(x['timestamp']),
                        x['timestamp'] if x['timestamp'] else ''
                    ),
                    reverse=True
                )
                
                # Take top 10 most relevant results
                unique_results = unique_results[:10]
                
                # Format results with enhanced metadata and structured content
                formatted_results = {
                    "query": query,
                    "total_results": len(unique_results),
                    "sources": ["Brave Search", "Serper"],
                    "results": [],
                    "metadata": {
                        "execution_time": time.time() - start_time,
                        "providers_responded": len([r for r in results if not isinstance(r, Exception)]),
                        "total_matches": len(combined_results)
                    }
                }
                
                for result in unique_results:
                    # Clean and structure the content
                    clean_snippet = ' '.join(result['snippet'].split())  # Normalize whitespace
                    
                    formatted_results["results"].append({
                        "title": result['title'],
                        "url": result['link'],
                        "timestamp": result['timestamp'],
                        "snippet": clean_snippet,
                        "source": result['source'],
                        "relevance_score": result['relevance_score'],
                        "keywords": [word for word in query.lower().split() 
                                   if word.lower() in clean_snippet.lower()]
                    })
                
                # Convert to string format for CrewAI consumption
                results_str = f"Research Results for: {query}\n\n"
                results_str += f"Found {len(unique_results)} relevant sources:\n\n"
                
                for idx, result in enumerate(unique_results, 1):
                    results_str += f"{idx}. {result['title']}\n"
                    results_str += f"   Source: {result['source']}\n"
                    results_str += f"   URL: {result['link']}\n"
                    if result['timestamp']:
                        results_str += f"   Published: {result['timestamp']}\n"
                    results_str += f"   Summary: {result['snippet']}\n\n"
                    
                return json.dumps(formatted_results)
                
        except Exception as e:
            error_msg = f"Error executing search: {str(e)}"
            print(error_msg)
            return json.dumps({
                "error": error_msg,
                "results": []
            })

    def _run(self, query: str, *args, **kwargs) -> str:
        """Synchronous wrapper for async execution"""
        return asyncio.run(self._arun(query, *args, **kwargs))
