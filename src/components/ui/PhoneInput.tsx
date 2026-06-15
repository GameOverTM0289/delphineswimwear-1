'use client';

// Phone input — country dial code dropdown + numeric phone field.
// Emits two values: phoneCountry (ISO-2) and phone (digits only).

import { useMemo } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { COUNTRIES, DEFAULT_COUNTRY } from '@/lib/data/countries';

interface Props {
  phoneCountry: string;
  phone: string;
  onChange: (next: { phoneCountry: string; phone: string }) => void;
  required?: boolean;
}

export default function PhoneInput({
  phoneCountry,
  phone,
  onChange,
  required,
}: Props) {
  const options = useMemo(() => {
    const al = COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY);
    const rest = COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY).slice().sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    return (al ? [al, ...rest] : rest).map((country) => ({
      value: country.code,
      label: `${country.code} +${country.dial}`,
      helper: country.name,
      searchText: `${country.name} ${country.code} +${country.dial}`,
    }));
  }, []);

  return (
    <div className="phone-input">
      <SearchableSelect
        className="phone-code-select"
        value={phoneCountry}
        options={options}
        onChange={(nextCountry) => onChange({ phoneCountry: nextCountry, phone })}
        ariaLabel="Country dial code"
        placeholder="Code"
        searchPlaceholder="Search country or code"
        required={required}
      />
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="tel-national"
        required={required}
        placeholder="Phone number"
        value={phone}
        onChange={(e) =>
          onChange({
            phoneCountry,
            phone: e.target.value.replace(/\D+/g, '').slice(0, 15),
          })
        }
      />
    </div>
  );
}
