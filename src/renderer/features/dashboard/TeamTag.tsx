type TeamTagProps = {
  senderName?: string;
};

export const TeamTag = ({ senderName }: TeamTagProps) => {
  const name = senderName?.trim() || 'Team member';

  return (
    <span className="team-tag" title={name}>
      Team
      <span className="team-tag__tip" role="tooltip">
        {name}
      </span>
    </span>
  );
};
