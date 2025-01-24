from pytrends.request import TrendReq
import json
import sys

def get_trending_topics(category='all'):
    try:
        pytrends = TrendReq(hl='en-US', tz=360)

        # Get real-time trending searches
        trending_searches = pytrends.trending_searches(pn='united_states')

        # Convert to list of topics with engagement scores
        topics = []
        if trending_searches is not None and len(trending_searches) > 0:
            for idx, topic in enumerate(trending_searches.values[:10]):
                # Calculate a mock engagement score (100 - position*8 to give higher scores to top trends)
                score = 100 - (idx * 8)
                topics.append({
                    "name": str(topic),
                    "score": score,
                    "description": "Trending search topic in the United States"
                })

        if not topics:
            # Fallback data if no trends are found
            topics = [
                {
                    "name": "Digital Marketing",
                    "score": 95,
                    "description": "Latest trends in digital marketing strategies"
                },
                {
                    "name": "Content Creation",
                    "score": 88,
                    "description": "Best practices in content creation"
                },
                {
                    "name": "Social Media Strategy",
                    "score": 82,
                    "description": "Current social media engagement patterns"
                }
            ]

        print(json.dumps(topics, ensure_ascii=False))
        return topics

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "fallback_topics": [{
                "name": "Content Strategy",
                "score": 95,
                "description": "Trending topics in content strategy"
            }]
        }), file=sys.stderr)
        return [{
            "name": "Content Strategy",
            "score": 95,
            "description": "Trending topics in content strategy"
        }]

if __name__ == "__main__":
    get_trending_topics()