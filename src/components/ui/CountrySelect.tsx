'use client';

import { useMemo } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { COUNTRIES, DEFAULT_COUNTRY } from '@/lib/data/countries';

interface Props {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
}

export default function CountrySelect({ value, onChange, required }: Props) {
  const options = useMemo(() => {
    const al = COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY);
    const rest = COUNTRIES.filter((c) => c.code !== DEFAULT_COUNTRY).slice().sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    return (al ? [al, ...rest] : rest).map((country) => ({
      value: country.code,
      label: country.name,
      helper: country.code,
      searchText: `${country.name} ${country.code} +${country.dial}`,
    }));
  }, []);

  return (
    <SearchableSelect
      className="country-select"
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel="Country"
      placeholder="Select country"
      searchPlaceholder="Search country"
      required={required}
    />
  );
}
