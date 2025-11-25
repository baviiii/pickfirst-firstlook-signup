import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { InputSanitizer } from '@/utils/inputSanitization';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

const countryCodes = [
  { code: '+61', country: 'AU', name: 'Australia' },
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+44', country: 'UK', name: 'United Kingdom' },
  { code: '+64', country: 'NZ', name: 'New Zealand' },
  { code: '+86', country: 'CN', name: 'China' },
  { code: '+91', country: 'IN', name: 'India' },
  { code: '+81', country: 'JP', name: 'Japan' },
  { code: '+82', country: 'KR', name: 'South Korea' },
  { code: '+65', country: 'SG', name: 'Singapore' },
  { code: '+852', country: 'HK', name: 'Hong Kong' }
];

export const PhoneInput = ({
  value,
  onChange,
  placeholder = 'Enter phone number',
  className,
  required,
  disabled,
  id
}: PhoneInputProps) => {
  const parsePhoneValue = (fullValue: string): { countryCode: string; number: string } => {
    if (!fullValue) return { countryCode: '+61', number: '' };
    
    const matchedCode = countryCodes.find(c => fullValue.startsWith(c.code));
    if (matchedCode) {
      return {
        countryCode: matchedCode.code,
        number: fullValue.substring(matchedCode.code.length).trim()
      };
    }
    
    return { countryCode: '+61', number: fullValue };
  };

  const [countryCode, setCountryCode] = useState<string>(parsePhoneValue(value).countryCode);
  const [phoneNumber, setPhoneNumber] = useState<string>(parsePhoneValue(value).number);

  const handleCountryCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    const fullPhone = phoneNumber ? `${newCode} ${phoneNumber}` : newCode;
    onChange(fullPhone);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow only digits, spaces, hyphens, and parentheses
    const sanitized = input.replace(/[^\d\s\-()]/g, '');
    
    // Validate length (max 20 characters for international numbers)
    if (sanitized.length > 20) return;
    
    setPhoneNumber(sanitized);
    const fullPhone = sanitized ? `${countryCode} ${sanitized}` : countryCode;
    onChange(fullPhone);
  };

  const validatePhoneOnBlur = () => {
    if (!phoneNumber && !required) return;
    
    // Basic validation: at least 8 digits for a complete phone number
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length > 0 && digitsOnly.length < 8) {
      // Could show validation error here
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={countryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
        <SelectTrigger className="w-[120px] bg-card border border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border">
          {countryCodes.map(({ code, country, name }) => (
            <SelectItem key={code} value={code} className="text-foreground">
              {country} {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        onBlur={validatePhoneOnBlur}
        placeholder={placeholder}
        className="flex-1 bg-card border border-border text-foreground placeholder:text-muted-foreground"
        required={required}
        disabled={disabled}
      />
    </div>
  );
};
