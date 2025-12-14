import React, { useState } from 'react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Calculator } from 'lucide-react';

interface CalculatorInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CalculatorInput({ 
  id, 
  name, 
  value, 
  onChange, 
  placeholder = "0.0", 
  className = ""
}: CalculatorInputProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = (expr: string): number | null => {
    try {
      const cleanExpr = expr.substring(1).trim();
      
      // Only allow basic operations
      if (!/^[0-9+\-*/.() ]+$/.test(cleanExpr)) {
        return null;
      }
      
      // Simple calculations only
      if (cleanExpr.includes('+')) {
        const parts = cleanExpr.split('+');
        return parts.reduce((sum, part) => sum + parseFloat(part.trim()), 0);
      }
      if (cleanExpr.includes('*')) {
        const parts = cleanExpr.split('*');
        return parts.reduce((product, part) => product * parseFloat(part.trim()), 1);
      }
      if (cleanExpr.includes('/')) {
        const parts = cleanExpr.split('/');
        let result = parseFloat(parts[0].trim());
        for (let i = 1; i < parts.length; i++) {
          result /= parseFloat(parts[i].trim());
        }
        return result;
      }
      if (cleanExpr.includes('-')) {
        const parts = cleanExpr.split('-');
        let result = parseFloat(parts[0].trim());
        for (let i = 1; i < parts.length; i++) {
          result -= parseFloat(parts[i].trim());
        }
        return result;
      }
      
      return parseFloat(cleanExpr);
    } catch {
      return null;
    }
  };

  const handleChange = (inputValue: string) => {
    if (inputValue.startsWith('=')) {
      setIsCalculating(true);
      setError(null);
    } else {
      setIsCalculating(false);
      setError(null);
      onChange(inputValue);
    }
  };

  const handleBlur = () => {
    if (isCalculating && value.startsWith('=')) {
      const result = calculate(value);
      if (result !== null) {
        onChange(result.toString());
        setIsCalculating(false);
        setError(null);
      } else {
        setError('Invalid');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} ${isCalculating ? 'border-blue-500' : ''} ${error ? 'border-red-500' : ''}`}
        />
        {isCalculating && (
          <Calculator className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-blue-500" />
        )}
      </div>
      
      {isCalculating && value.length > 1 && !error && (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
          Calculator mode
        </Badge>
      )}
      
      {error && (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
          {error}
        </Badge>
      )}
    </div>
  );
}
