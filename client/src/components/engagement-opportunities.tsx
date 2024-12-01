import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, TrendingUp, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EngagementOpportunity {
  id: string;
  type: 'mention' | 'reply' | 'trend';
  content: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'engaged' | 'ignored';
}

export function EngagementOpportunities() {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<EngagementOpportunity[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStatusUpdate = async (id: string, status: 'engaged' | 'ignored') => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/engagement/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setOpportunities(opportunities.map(opp => 
        opp.id === id ? { ...opp, status } : opp
      ));

      toast({
        title: "Status Updated",
        description: `Opportunity ${status === 'engaged' ? 'engaged' : 'ignored'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update opportunity status",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/engagement/opportunities');
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      const data = await response.json();
      setOpportunities(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load engagement opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'reply':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Engagement Opportunities</h2>
        <Button
          variant="outline"
          onClick={fetchOpportunities}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                {getOpportunityIcon(opportunity.type)}
                <CardTitle className="text-base font-medium">
                  {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)} Opportunity
                </CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityClass(opportunity.priority)}`}>
                  {opportunity.priority}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(opportunity.timestamp).toLocaleString()}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{opportunity.content}</p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(opportunity.id, 'ignored')}
                  disabled={updatingId === opportunity.id || opportunity.status !== 'pending'}
                >
                  {updatingId === opportunity.id ? 'Updating...' : 'Ignore'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusUpdate(opportunity.id, 'engaged')}
                  disabled={updatingId === opportunity.id || opportunity.status !== 'pending'}
                >
                  {updatingId === opportunity.id ? 'Updating...' : 'Engage'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {opportunities.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No engagement opportunities found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
