import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import './workspace-heading.css';

interface WorkspaceHeadingProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  backTo?: string;
  backLabel?: string;
  children?: ReactNode;
}

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  backTo,
  backLabel = 'Back to dashboard',
  children,
}: WorkspaceHeadingProps) {
  return (
    <header className="workspace-heading">
      <div className="workspace-heading-copy">
        {backTo && (
          <Button asChild variant="ghost" size="sm" className="workspace-heading-back">
            <Link to={backTo}><ArrowLeft size={14} aria-hidden="true" />{backLabel}</Link>
          </Button>
        )}
        <p className="eyebrow"><span className="heading-marker" aria-hidden="true" />{eyebrow}</p>
        <h1>{title.replace(/\.$/, '')}<span>.</span></h1>
        <p className="workspace-heading-description">{description}</p>
      </div>
      {children && <div className="workspace-heading-aside">{children}</div>}
    </header>
  );
}
