type StatCardProps = {
  eyebrow: string;
  title: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
};

export const StatCard = ({ eyebrow, title, value, tone = 'neutral' }: StatCardProps) => {
  return (
    <article className="stat-card" data-tone={tone}>
      <p className="stat-card__eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <strong>{value}</strong>
    </article>
  );
};
