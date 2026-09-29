import React from 'react';
import { sanitizeVerifiedWording } from '@/lib/clean-ad';

interface AdDescriptionProps {
  description: string | null | undefined;
  className?: string;
}

export function AdDescription({ description, className = "" }: AdDescriptionProps) {
  if (!description) return null;
  
  const sanitized = sanitizeVerifiedWording(description);
  if (!sanitized) return null;

  const lines = sanitized.split(',').map(line => line.trim()).filter(Boolean);
  
  if (lines.length <= 1) {
    return <p className={className}>{sanitized}</p>;
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
