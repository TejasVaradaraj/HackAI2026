function MetricCard({ icon, label, value, color, tooltip }) {
  return (
    <div className="p-5 rounded-2xl bg-panel border border-border">
      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs text-slate-500">{label}</p>
        {tooltip && (
          <div className="relative group">
            <span className="material-symbols-outlined text-[13px] text-slate-600 hover:text-primary cursor-help transition-colors">info</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
            </div>
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${color || "text-slate-100"}`}>{value}</p>
    </div>
  );
}

export default function MetricCards({ data, loading }) {
  if (loading || !data.length) {
    const placeholders = ["Post Volume", "Avg Sentiment", "Churn Rate", "Advocacy Rate"];
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {placeholders.map((label) => (
          <div key={label} className="p-5 rounded-2xl bg-panel border border-border">
            <div className="size-10 rounded-xl bg-primary/10 mb-3 animate-pulse" />
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-700">—</p>
          </div>
        ))}
      </div>
    );
  }

  // Use the last 7 entries for volume sum, latest entry for other metrics
  const recent = data.slice(-7);
  const latest = data[data.length - 1];
  const totalVolume = recent.reduce((sum, d) => sum + (d.post_volume || 0), 0);
  const rawSentiment = latest.weighted_score || 0;
  const sentiment = Math.round((rawSentiment + 1) * 50); // convert [-1,+1] to [0,100]
  const sentimentColor = sentiment > 55 ? "text-emerald-400" : sentiment < 45 ? "text-red-400" : "text-slate-300";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon="forum"
        label="Post Volume (7d)"
        value={totalVolume.toLocaleString()}
        tooltip="Total Reddit posts about this brand in the last 7 days. Higher volume means more data points, making the LSTM sentiment projection more confident and responsive to shifts."
      />
      <MetricCard
        icon="sentiment_satisfied"
        label="Avg Sentiment"
        value={`${sentiment}/100`}
        color={sentimentColor}
        tooltip="Composite FinBERT + VADER score rescaled to 0–100. Above 55 is positive, below 45 is negative. This is the primary input to the LSTM — sustained highs or lows drive the 14-day forecast trend."
      />
      <MetricCard
        icon="trending_down"
        label="Churn Rate"
        value={`${((latest.churn_rate || 0) * 100).toFixed(1)}%`}
        tooltip="Percentage of users who posted negatively then stopped engaging. Rising churn signals eroding brand loyalty and pulls the projected sentiment curve downward over time."
      />
      <MetricCard
        icon="volunteer_activism"
        label="Advocacy Rate"
        value={`${((latest.advocacy_rate || 0) * 100).toFixed(1)}%`}
        tooltip="Percentage of users who consistently post positively about this brand. Strong advocacy acts as a stabilising force in the projection — high advocacy buffers against sentiment dips."
      />
    </div>
  );
}
