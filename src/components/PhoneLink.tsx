import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneLinkProps {
  phoneNumber: string | undefined;
  className?: string;
  showIcon?: boolean;
  showNumber?: boolean;
}

export function PhoneLink({ 
  phoneNumber, 
  className = "", 
  showIcon = false, 
  showNumber = true 
}: PhoneLinkProps) {
  if (!phoneNumber) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  // Clean phone number for tel: link (remove spaces, dashes, parentheses)
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

  return (
    <a 
      href={`tel:${cleanNumber}`}
      className={`text-primary hover:text-primary/80 underline cursor-pointer inline-flex items-center gap-1 ${className}`}
      title="Click to call"
    >
      {showIcon && <Phone className="h-3 w-3" />}
      {showNumber && phoneNumber}
      {!showNumber && showIcon && '📞'}
    </a>
  );
}
