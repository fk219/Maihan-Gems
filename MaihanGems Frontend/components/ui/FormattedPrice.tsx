'use client';

import React from 'react';
import { useStorefront } from '@/components/providers/StorefrontProvider';

interface FormattedPriceProps {
  amount: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function FormattedPrice({
  amount,
  className = '',
  prefix = '',
  suffix = '',
}: FormattedPriceProps) {
  const { formatPrice } = useStorefront();

  return (
    <span className={className}>
      {prefix}
      {formatPrice(amount)}
      {suffix}
    </span>
  );
}
