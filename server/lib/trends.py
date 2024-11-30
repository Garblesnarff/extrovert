from pytrends.request import TrendReq
import json

def get_trending_topics(category='all'):
    try:
        pytrends = TrendReq(hl='en-US', tz=360)
        
        # Get real-time trending searches
        trending_searches = pytrends.trending_searches(pn='united_states')
        
        # Convert to list of topics with engagement scores
        topics = []
        for idx, topic in enumerate(trending_searches.values[:10]):
            # Calculate a mock engagement score (100 - position*8 to give higher scores to top trends)
            score = 100 - (idx * 8)
            topics.append({
                "name": str(topic),
                "score": score,
                "description": "Trending search topic in the United States"
            })
        
        return json.dumps(topics, ensure_ascii=False)
    except Exception as e:
        return json.dumps([{
            "name": "Sample Topic",
            "score": 95,
            "description": "Error fetching trends, showing sample data"
        }])

if __name__ == "__main__":
    print(get_trending_topics())
