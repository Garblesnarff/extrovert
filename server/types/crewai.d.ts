declare module 'crewai' {
  export interface AgentConfig {
    name: string;
    goal: string;
    backstory: string;
    allowDelegation?: boolean;
    verbose?: boolean;
  }

  export interface TaskConfig {
    description: string;
    agent: Agent;
    expected_output?: string;
  }

  export class Agent {
    constructor(config: AgentConfig);
  }

  export class Task {
    constructor(config: TaskConfig);
  }

  export class Crew {
    constructor(config: {
      agents: Agent[];
      tasks: Task[];
      verbose?: boolean;
    });
    kickoff(inputs?: any): Promise<any>;
  }
}
