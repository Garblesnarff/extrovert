import { Agent, Crew, Task } from 'crewai';

export class OptimizedTwitterCrews {
  private createEngagementExpert() {
    return new Agent({
      name: 'Engagement Expert',
      goal: 'Maximize tweet engagement by optimizing content and timing',
      backstory: 'Expert in social media engagement and viral content creation',
      allowDelegation: true,
      verbose: true
    });
  }

  private createContentResearcher() {
    return new Agent({
      name: 'Content Researcher',
      goal: 'Research and verify information to enhance tweet credibility',
      backstory: 'Seasoned researcher with expertise in fact-checking and content enrichment',
      allowDelegation: true,
      verbose: true
    });
  }

  private createStrategyAnalyst() {
    return new Agent({
      name: 'Strategy Analyst',
      goal: 'Analyze and optimize content strategy for maximum impact',
      backstory: 'Social media strategist with deep understanding of audience behavior',
      allowDelegation: true,
      verbose: true
    });
  }

  setup_engagement_community_crew() {
    const engagementExpert = this.createEngagementExpert();
    const strategyAnalyst = this.createStrategyAnalyst();

    const analyzeContent = new Task({
      description: 'Analyze tweet content for engagement potential and suggest improvements',
      agent: engagementExpert
    });

    const optimizeStrategy = new Task({
      description: 'Develop optimal posting strategy and engagement hooks',
      agent: strategyAnalyst
    });

    return new Crew({
      agents: [engagementExpert, strategyAnalyst],
      tasks: [analyzeContent, optimizeStrategy],
      verbose: true
    });
  }

  setup_research_enhancement_crew() {
    const contentResearcher = this.createContentResearcher();
    const engagementExpert = this.createEngagementExpert();

    const researchContent = new Task({
      description: 'Research and verify tweet content, adding valuable context',
      agent: contentResearcher
    });

    const enhanceContent = new Task({
      description: 'Enhance researched content for better engagement while maintaining accuracy',
      agent: engagementExpert
    });

    return new Crew({
      agents: [contentResearcher, engagementExpert],
      tasks: [researchContent, enhanceContent],
      verbose: true
    });
  }

  setup_discovery_strategy_crew() {
    const strategyAnalyst = this.createStrategyAnalyst();
    const contentResearcher = this.createContentResearcher();

    const analyzeTopics = new Task({
      description: 'Analyze trending topics and identify strategic opportunities',
      agent: strategyAnalyst
    });

    const researchTrends = new Task({
      description: 'Research trending topics and gather supporting information',
      agent: contentResearcher
    });

    return new Crew({
      agents: [strategyAnalyst, contentResearcher],
      tasks: [analyzeTopics, researchTrends],
      verbose: true
    });
  }

  async execute_full_workflow({ content }: { content: string }) {
    const engagementCrew = this.setup_engagement_community_crew();
    const researchCrew = this.setup_research_enhancement_crew();
    const strategyCrew = this.setup_discovery_strategy_crew();

    const [engagementResults, researchResults, strategyResults] = await Promise.all([
      engagementCrew.kickoff({ content }),
      researchCrew.kickoff({ content }),
      strategyCrew.kickoff({ content })
    ]);

    return {
      engagement: engagementResults,
      research: researchResults,
      strategy: strategyResults
    };
  }
}
