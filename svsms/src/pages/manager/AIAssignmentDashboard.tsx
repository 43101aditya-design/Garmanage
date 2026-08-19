import React, { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, Check, RefreshCw, ShieldCheck, UserRoundX, UsersRound } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useGarageStore } from '../../store/garageStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

type Recommendation = any;

const percentage = (value: unknown) => `${Math.round(Number(value || 0) * 100)}%`;

export const AIAssignmentDashboard = () => {
  const { currentGarage } = useGarageStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { mechanicId: string; reason: string }>>({});

  const load = useCallback(async () => {
    if (!currentGarage) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await apiClient.get(`/ai/recommendations?garage_id=${encodeURIComponent(currentGarage.id)}`);
      setRecommendations(Array.isArray(response) ? response : response.data || []);
      setError(null);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to load AI recommendations.');
    } finally { setLoading(false); }
  }, [currentGarage]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!currentGarage) return;
    setGenerating(true);
    try {
      await apiClient.post('/ai/jobs/batch-recommendation', { garage_id: currentGarage.id });
      await load();
    } catch (requestError: any) { setError(requestError.message || 'Unable to generate recommendations.'); }
    finally { setGenerating(false); }
  };

  const approve = async (recommendation: Recommendation) => {
    const override = overrides[recommendation.id];
    try {
      await apiClient.post(`/ai/recommendations/${recommendation.id}/approve`, override?.mechanicId && override.mechanicId !== recommendation.recommended_mechanic_id
        ? { mechanic_id: override.mechanicId, override_reason: override.reason }
        : {});
      await load();
    } catch (requestError: any) { setError(requestError.message || 'Approval could not be completed. Refresh and review the current constraints.'); }
  };

  const reject = async (recommendation: Recommendation) => {
    try { await apiClient.post(`/ai/recommendations/${recommendation.id}/reject`, { reason: 'Manager rejected recommendation' }); await load(); }
    catch (requestError: any) { setError(requestError.message || 'Recommendation could not be rejected.'); }
  };

  if (!currentGarage) return <div className="p-10 text-center text-gray-500">Select a garage before reviewing AI assignments.</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><BrainCircuit className="h-7 w-7 text-indigo-600" /><h1 className="text-3xl font-bold text-gray-900">AI Assignment Review</h1></div>
          <p className="mt-2 text-sm text-gray-600">Recommendations are advisory. Approval rechecks eligibility, workload, availability, and job status before creating an assignment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button onClick={generate} disabled={generating}><BrainCircuit className="mr-2 h-4 w-4" />{generating ? 'Optimizing…' : 'Generate ready jobs'}</Button>
        </div>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900 flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0" /><span>Hard constraints are applied before ranking: garage membership, active status, leave, recorded availability, schedule conflicts, mandatory skills, and workload capacity.</span></div>
      {loading ? <div className="p-10 text-center text-gray-500">Loading recommendations…</div> : recommendations.length === 0 ? (
        <Card><CardContent className="p-10 text-center"><UsersRound className="mx-auto mb-3 h-10 w-10 text-gray-400" /><p className="font-medium">No pending recommendations</p><p className="mt-1 text-sm text-gray-500">Generate recommendations for READY_FOR_ASSIGNMENT jobs when you are ready to review them.</p></CardContent></Card>
      ) : recommendations.map(record => {
        const data = record.reasoning_data || {};
        const recommended = data.recommended_candidate || {};
        const alternatives = data.alternatives || [];
        const selected = overrides[record.id]?.mechanicId || record.recommended_mechanic_id;
        const selectedCandidate = [recommended, ...alternatives].find(candidate => candidate.mechanic_id === selected) || recommended;
        const isOverride = selected !== record.recommended_mechanic_id;
        return <Card key={record.id} className="overflow-hidden">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><CardTitle>{record.job_number || `Job ${record.job_card_id.slice(0, 8)}`}</CardTitle><p className="mt-1 text-sm text-gray-600">{record.service_type} · {record.priority} priority · {record.estimated_duration_minutes ?? 'Unspecified'} min estimate</p></div><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.mode === 'ML_RANKING' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-800'}`}>{record.mode === 'ML_RANKING' ? 'ML ranking' : 'Cold start'}</span><p className="mt-2 text-xs text-gray-500">{record.mode === 'ML_RANKING' ? 'Probability' : 'Suitability score'} · model {record.model_version}</p></div></div>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Recommended mechanic</p><h2 className="mt-2 text-xl font-bold text-gray-900">{recommended.display_name}</h2><p className="mt-1 text-3xl font-bold text-indigo-700">{percentage(record.suitability_score)}</p><p className="text-xs text-gray-500">{record.mode === 'ML_RANKING' ? 'Estimated successful/efficient-completion probability' : 'Normalized deterministic suitability score'}</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Current workload</dt><dd className="font-medium">{recommended.workload_minutes ?? '—'} min</dd></div><div className="flex justify-between"><dt>Availability</dt><dd className="font-medium">{recommended.availability_known ? percentage(recommended.availability_score) : 'Window unavailable'}</dd></div><div className="flex justify-between"><dt>Skill match</dt><dd className="font-medium">{recommended.skill_match === null ? 'Not recorded' : recommended.skill_match ? 'Required skills met' : 'No'}</dd></div></dl></div>
            <div className="lg:col-span-1"><h3 className="font-semibold text-gray-900">Why this recommendation</h3><ul className="mt-3 space-y-2 text-sm text-gray-700">{(data.explanation?.reasons || []).map((reason: string) => <li key={reason} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{reason}</li>)}</ul>{(data.explanation?.tradeoffs || []).map((tradeoff: string) => <p key={tradeoff} className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">Tradeoff: {tradeoff}</p>)}{(data.explanation?.unavailable_features || []).map((item: string) => <p key={item} className="mt-2 text-xs text-gray-500">Data note: {item}</p>)}</div>
            <div className="lg:col-span-1"><label className="text-sm font-semibold text-gray-900">Manager selection</label><select className="mt-2 w-full rounded-md border border-gray-300 bg-white p-2 text-sm" value={selected} onChange={event => setOverrides(current => ({ ...current, [record.id]: { mechanicId: event.target.value, reason: current[record.id]?.reason || '' } }))}><option value={recommended.mechanic_id}>{recommended.display_name} — recommended</option>{alternatives.map((candidate: any) => <option value={candidate.mechanic_id} key={candidate.mechanic_id}>{candidate.display_name} — {percentage(candidate.suitability_score)}</option>)}</select>{isOverride && <textarea className="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm" value={overrides[record.id]?.reason || ''} onChange={event => setOverrides(current => ({ ...current, [record.id]: { mechanicId: selected, reason: event.target.value } }))} placeholder="Override reason (required)" />}
              <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => approve(record)} disabled={isOverride && !overrides[record.id]?.reason.trim()}><Check className="mr-2 h-4 w-4" />{isOverride ? 'Approve override' : 'Approve assignment'}</Button><Button variant="outline" className="text-red-700" onClick={() => reject(record)}><UserRoundX className="mr-2 h-4 w-4" />Reject</Button></div></div>
          </CardContent>
        </Card>;
      })}
    </div>
  );
};
