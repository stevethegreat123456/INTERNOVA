import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface AdminChartsProps {
  universityMode?: boolean;
  universityName?: string;
}

export default function AdminCharts({ universityMode, universityName }: AdminChartsProps) {
  const [placementData, setPlacementData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [universityMode, universityName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*');
      
      if (appsError) throw appsError;
      
      let apps = applications || [];
      
      if (universityMode && universityName) {
        // Fetch profiles for the specific university to filter applications
        const { data: profiles, error: profsError } = await supabase
          .from('profiles')
          .select('id')
          .eq('university', universityName);
          
        if (!profsError && profiles) {
          const studentIds = profiles.map(p => p.id);
          apps = apps.filter(a => studentIds.includes(a.student_id));
        }
      }

      // Placements Data
      const accepted = apps.filter(a => a.status === 'accepted').length;
      const pending = apps.filter(a => a.status === 'pending').length;
      const other = apps.length - accepted - pending;
      
      setPlacementData([
        { name: 'Placed', value: accepted, color: '#10b981' }, // emerald
        { name: 'Pending', value: pending, color: '#f59e0b' }, // amber
        { name: 'Other', value: other, color: '#64748b' }, // slate
      ]);

      // Timeline Data
      const countsByDate: Record<string, number> = {};
      apps.forEach(a => {
        const date = new Date(a.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        countsByDate[date] = (countsByDate[date] || 0) + 1;
      });
      
      const timeline = Object.keys(countsByDate).map(date => ({
        date,
        Applications: countsByDate[date]
      }));
      setTimelineData(timeline);
      
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-sm text-slate-500 animate-pulse">Loading charts...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Application Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={placementData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {placementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Application Volume</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
              <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
