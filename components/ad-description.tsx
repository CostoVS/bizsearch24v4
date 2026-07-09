import React from 'react';

interface AdDescriptionProps {
  description: string | null | undefined;
  className?: string;
}

export function AdDescription({ description, className = "" }: AdDescriptionProps) {
  if (!description) return null;
  
  const lines = description.split(',').map(line => line.trim()).filter(Boolean);
  
  if (lines.length <= 1) {
    return <p className={className}>{description}</p>;
  }

  return (
    <p className={className}>
      {lines.map((line, idx) => (
        <span key={idx} className="block">
          {line}{idx < lines.length - 1 ? ',' : ''}
        </span>
      ))}
    </p>
  );
}
